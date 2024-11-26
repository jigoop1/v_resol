// same file but differnt name.....
// made by theguy

const puppeteer = require('puppeteer-extra');
const chrome = require('@sparticuz/chromium');

// Stealth plugin issue - There is a good fix but currently this works.
require('puppeteer-extra-plugin-user-data-dir')
require('puppeteer-extra-plugin-user-preferences')
require('puppeteer-extra-plugin-stealth/evasions/chrome.app')
require('puppeteer-extra-plugin-stealth/evasions/chrome.csi')
require('puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes')
require('puppeteer-extra-plugin-stealth/evasions/chrome.runtime')
require('puppeteer-extra-plugin-stealth/evasions/defaultArgs') // pkg warned me this one was missing
require('puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow')
require('puppeteer-extra-plugin-stealth/evasions/media.codecs')
require('puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency')
require('puppeteer-extra-plugin-stealth/evasions/navigator.languages')
require('puppeteer-extra-plugin-stealth/evasions/navigator.permissions')
require('puppeteer-extra-plugin-stealth/evasions/navigator.plugins')
require('puppeteer-extra-plugin-stealth/evasions/navigator.vendor')
require('puppeteer-extra-plugin-stealth/evasions/navigator.webdriver')
require('puppeteer-extra-plugin-stealth/evasions/sourceurl')
require('puppeteer-extra-plugin-stealth/evasions/user-agent-override')
require('puppeteer-extra-plugin-stealth/evasions/webgl.vendor')
require('puppeteer-extra-plugin-stealth/evasions/window.outerdimensions')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// This function can run for a maximum of 30 seconds
export const config = {
  maxDuration: 60,
};


export default async (req: any, res: any) => {
  let {body,method} = req

  // Some header shits
  if (method !== 'POST') {
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    return res.status(200).end()
  }

  // Some checks...
  if (!body) return res.status(400).end(`No body provided`)
  if (typeof body === 'object' && !body.id) return res.status(400).end(`No url provided`)

  const id = body.id;
  if (body.selector === '') {
     const selector = 'html'
  } else {
     const selector = body.selector
  }
  const isProd = process.env.NODE_ENV === 'production';
  // create browser based on ENV
  let browser;
  if (isProd) {
    browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true
    })
  } else {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
  }
  const page = await browser.newPage();
  // await page.setViewport({ width: 1920, height: 1080 });
  await page.setRequestInterception(true);
  // await page.evaluateOnNewDocument(() =>
    // Object.defineProperty(navigator, 'platform', {
      // get: function () {
        // return 'Win32';
        // },
    // })
  // );
  // Set headers,else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/' });

  const logger: string[] = [];
  const finalResponse:{source:string} = {source:''}
  // Define our blocked extensions
  const blockedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.svg'];
  // Use CDP session to block resources
  await page.client().send('Network.setBlockedURLs', { urls: blockedExtensions });

  // await page.setRequestInterception(true);
  page.on('request', async (interceptedRequest) => {
    await (async () => {
      var response = await req.response();
      try {
          if (req.redirectChain().length === 0) {
            var response = await response.buffer();
            const contentType = response.headers.get("content-type");
            var data;
            if (contentType && contentType.includes("application/json")) {
              data = await response.json();
            }
            else {
              data = await response.text();
            }
            finalResponse.source = data
            return finalResponse;
            //  finalResponse.source = await response.content();
            //  console.log(responseBody.toString());
          }
      }catch (err) { console.log(err); }
    })
    interceptedRequest.continue();
  });

  // await page.on('request', req => {
  //     req.continue();
  // });
  // page.on('response', res => {
  //   if (res.url().includes('scripts'))
  //       console.log(res.url());
  //   });
  // const res = await page.waitForResponse(response => response.url().includes('scripts'));
  // console.log(await res.text());
  try {
    const [req] = await Promise.all([
      page.goto(id, { waitUntil: 'domcontentloaded' , timeout: 30000 }),
      await page.waitForSelector(`${selector}`, { timeout: 9000 }),
      await page.click(`${selector}`)
      // Extract the entire HTML content of the page
      // const pageHTML = await page.content(),
      // Identify the iframe using a selector or any other appropriate method
      // const jsonData = JSON.stringify({ trustpilotContent });
      // await page.waitForSelector(".jw-state-playing"),
      // await waitTillHTMLRendered(page),
      // await page.waitForNavigation({waitUntil: 'networkidle0', }),
    ]);
  } catch (error) {
    return res.status(500).end(`Server Error: ${error.message},check the params.`)
  }

  if (browser) await browser.close();

  // Response headers.
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate')
  res.setHeader('Content-Type', 'application/json')
  // CORS
  // res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  // console.log(finalResponse);
  res.json(finalResponse);
};