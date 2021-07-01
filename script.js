import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import prettyBytes from "pretty-bytes";

import setupEditors from "./setupEditor";

const form = document.querySelector("[data-form]");
const queryParamsContainer = document.querySelector("[data-query-params]");
const requestHeadersContainer = document.querySelector(
    "[data-request-headers]"
);
const resposneHeadersContainer = document.querySelector(
    "[data-response-headers]"
);
const keyValueTemplate = document.querySelector("[data-key-value-template]");

document
    .querySelector("[data-add-query-param-btn]")
    .addEventListener("click", () => {
        queryParamsContainer.append(createKeyValuePair());
    });

document
    .querySelector("[data-add-request-header-btn]")
    .addEventListener("click", () => {
        requestHeadersContainer.append(createKeyValuePair());
    });

function createKeyValuePairWithData(key, value, container) {
    const element = keyValueTemplate.content.cloneNode(true);
    element.querySelector("[data-remove-btn]").addEventListener("click", (e) => {
        e.target.closest("[data-key-value-pair]").remove();
    });
    element.querySelector('[data-key]').value = key;
    element.querySelector('[data-value]').value = value;
    container.append(element);
}

document.getElementById('list-group-urls').addEventListener("click", (e) => {

    if (e.target.tagName !== "LI") return;
    const url = e.target.textContent;
    fireRequestFromUrl(url);
    const inputEL = document.querySelector('[data-url]');
    inputEL.value = url;
})



axios.interceptors.request.use(request => {
    request.customData = request.customData || {};
    request.customData.startTime = new Date().getTime();
    return request;
});

function updateEndTime(response) {
    response.customData = response.customData || {};
    response.customData.time = new Date().getTime() - response.config.customData.startTime
    return response;
}

axios.interceptors.response.use(updateEndTime, e => {
    return Promise.reject(updateEndTime(e.response));
});

const { requestEditor, updateResponseEditor, updateRequestEditor } = setupEditors();

form.addEventListener("submit", (e) => {
    e.preventDefault();
    let data;
    try {
        data = JSON.parse(requestEditor.state.doc.toString() || null);
    } catch (e) {
        alert('JSON data is incorret!');
        return;
    }

    const url = document.querySelector("[data-url]").value;
    const method = document.querySelector("[data-method]").value;
    const params = keyValuePairsToObject(queryParamsContainer);
    const header = keyValuePairsToObject(requestHeadersContainer);

    axiosRequest({ url, method, params, header, data });
});

init();
queryParamsContainer.append(createKeyValuePair());
requestHeadersContainer.append(createKeyValuePair());

function axiosRequest({ url, method, params, headers, data }) {
    axios({
        url,
        method,
        params,
        headers,
        data,
    })
        .catch(e => e)
        .then((response) => {
            document.querySelector("[data-response-section]").classList.remove("d-none");
            updateResponseDetails(response);
            updateResponseEditor(response.data);
            updateResponseHeaders(response.headers);
        });

    setUrlTOLS(url, method, params, headers, data);
}

function createKeyValuePair() {
    const element = keyValueTemplate.content.cloneNode(true);
    element.querySelector("[data-remove-btn]").addEventListener("click", (e) => {
        e.target.closest("[data-key-value-pair]").remove();
    });
    return element;
}

function keyValuePairsToObject(container) {
    const pairs = container.querySelectorAll("[data-key-value-pair]");
    return [...pairs].reduce((data, pair) => {
        const key = pair.querySelector("[data-key]").value;
        const value = pair.querySelector("[data-value]").value;
        if (key === "") return data;
        return { ...data, [key]: value };
    }, {});
}

function updateResponseHeaders(headers) {
    resposneHeadersContainer.innerHTML = '';
    Object.entries(headers).forEach(([key, value]) => {
        const keyElement = document.createElement('div');
        keyElement.textContent = key;
        resposneHeadersContainer.append(keyElement);

        const valueElement = document.createElement('div');
        valueElement.textContent = value;
        resposneHeadersContainer.append(valueElement);
    })
}

function updateResponseDetails(resposne) {
    document.querySelector('[data-status]').textContent = resposne.status;
    document.querySelector('[data-time]').textContent = resposne.customData.time;
    document.querySelector('[data-size]').textContent = prettyBytes(JSON.stringify(resposne.data).length + JSON.stringify(resposne.headers).length)
}

function renderUrlsList(urls) {
    const ulEl = document.getElementById('list-group-urls');
    ulEl.innerHTML = ''
    urls.forEach(url => {
        const liEl = document.createElement('li');
        liEl.classList.add('list-group-item');
        liEl.style.cursor = 'pointer';
        liEl.textContent = url.url;
        ulEl.append(liEl);
    });
}

function fireRequestFromUrl(url) {
    const urls = getUrlsFromLS();
    const urlData = urls.find(urlObj => urlObj.url == url);
    axiosRequest(urlData);
    updateRequestEditor(urlData.data);
    queryParamsContainer.innerHTML = '';
    updateRequestInfo(urlData.params, queryParamsContainer);
    requestHeadersContainer.innerHTML = '';
    updateRequestInfo(urlData.headers, requestHeadersContainer);
    queryParamsContainer.append(createKeyValuePair());
    requestHeadersContainer.append(createKeyValuePair());
}

function updateRequestInfo(params, container) {
    if (!params) return;
    Object.entries(params).forEach(([key, value]) => {
        createKeyValuePairWithData(key, value, container)
    })
}

function setUrlTOLS(url, method, params, headers, data) {

    let urls = getUrlsFromLS() || [];
    if (urls.length > 4) {
        urls.pop();
    }
    const URL = {
        url, method, params, headers, data
    }
    urls.unshift(URL);
    localStorage.setItem('urls', JSON.stringify(urls));
    renderUrlsList(urls);
}

function getUrlsFromLS() {
    return JSON.parse(localStorage.getItem('urls'));
}

function init() {
    let urls = getUrlsFromLS() || [];
    renderUrlsList(urls);
}
