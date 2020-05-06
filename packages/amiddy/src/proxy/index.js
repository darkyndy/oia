import httpProxy from 'http-proxy';
import vhost from 'vhost';


import proxyListen from './listen';
import proxyUtils from './utils';


const privateApi = {};

/**
 * Get proxy response options
 *
 * @param {Object} config
 * @return {Object}
 */
privateApi.getResponseOptions = (config) => {
  const options = {
    headers: {},
  };

  const proxyResponseOptions = config && config.proxy && config.proxy.response || {};
  const proxyResponseHeaders = proxyResponseOptions.headers;
  if (proxyResponseHeaders && typeof proxyResponseHeaders === 'object') {
    options.headers = proxyResponseHeaders;
  }

  return options;
};

/**
 * Returns callback for vhost
 *
 * @param {Object} proxy
 * @param {Object} ssl
 * @param {Object} config
 * @return {Function}
 */
privateApi.vhostCb = (proxy, ssl, config) => {
  // source conf
  const source = config.source;
  // vhost conf
  const vhostConf = config.vhost;
  // base proxy config, can be overwritten by every dependency
  const proxyConf = config.proxy;
  // base proxy config, can be overwritten by every dependency
  const proxyOptions = proxyConf && proxyConf.options || {};
  // dependencies
  const deps = config.deps;

  return (req, res) => {

    const useProxyOptions = {
      changeOrigin: false,
      secure: false,
      ws: false,
      ...proxyOptions,
      headers: {
        ...proxyOptions.headers,
        host: vhostConf.name,
      },
      target: proxyUtils.buildUrl(source),
    };


    // get dependency that will proxy this request
    const dependency = proxyUtils.getDependency(deps, req.url);

    // extend proxy options if there is a dependency that will be used as proxy
    proxyUtils.extendOptions(useProxyOptions, ssl, dependency);

    // proxy request
    proxy.proxyRequest(req, res, useProxyOptions);
  };
};


const service = {};

/**
 * Create proxy middleware.
 * Return `vhost` middleware.
 *
 * @param {Object} config
 * @param {Object} ssl
 * @return {Object} vhost
 */
service.create = (config, ssl) => {

  // create proxy
  const proxy = httpProxy.createProxyServer();

  // request
  proxy.on('proxyReq', proxyListen.request);

  // response
  const responseOptions = privateApi.getResponseOptions(config);
  proxy.on('proxyRes', proxyListen.response(responseOptions));

  // error
  proxy.on('error', proxyListen.error);

  return vhost(config.vhost.name, privateApi.vhostCb(proxy, ssl, config));
};


// only for testing
export {privateApi};

export default service;