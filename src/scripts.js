import fs from 'fs';
import log from './logger.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export const newAgent = (proxy = null) => {
    if (proxy) {
        if (proxy.startsWith('http://')) {
            return new HttpsProxyAgent(proxy);
        } else if (proxy.startsWith('socks4://') || proxy.startsWith('socks5://')) {
            return new SocksProxyAgent(proxy);
        } else {
            log.warn(`Unsupported proxy type: ${proxy}`);
            return null;
        }
    }
    return null;
}

export function loadFile(filePath) {
    try {
        const proxies = fs.readFileSync(filePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        return proxies;
    } catch (error) {
        log.error(`Failed to read file ${filePath}`);
        process.exit(0);
    }
}

export function loadProxies(filePath) {
    try {
        const proxies = fs.readFileSync(filePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        return proxies;
    } catch (error) {
        log.error(`Failed to read proxies running Without proxies...`);
    }
}

export function generateDeviceId() {
    const hexChars = '0123456789abcdef';
    let deviceId = '';
    for (let i = 0; i < 32; i++) {
        deviceId += hexChars[Math.floor(Math.random() * hexChars.length)];
    }
    return deviceId;
}
