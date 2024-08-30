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
  if (typeof body === 'object' && !body.iurl) return res.status(400).end(`No url provided`)

  const iurl = body.iurl;
  const selector = 'html';
  const isProd = process.env.NODE_ENV === 'production';
 if (body.selector === '') {
    const selector = 'html'
 } else {
    const selector = body.selector
 }
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
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setRequestInterception(true);
  await page.evaluateOnNewDocument(() =>
    Object.defineProperty(navigator, 'platform', {
      get: function () {
        return 'Win32';
        },
    })
  );
  // Set headers,else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/' });

  const logger: string[] = [];
  const finalResponse:{source:string} = {source:''}
  // Define our blocked extensions
  const blockedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.svg'];
  // Use CDP session to block resources
  await page.client().send('Network.setBlockedURLs', { urls: blockedExtensions });

  // define a scraper function
    async function scraper(page) {

        // iterate through the product containers to extract the products
        const products = await page.$$eval(".flex.flex-col.items-center.rounded-lg", elements => {
            return elements.map(element => {
                const nameElement = element.querySelector(".self-start.text-left.w-full > span:first-child");
                const priceElement = element.querySelector(".text-slate-600");
                const imageElement = element.querySelector("img");

                // return the extracted data
                return {
                    name: nameElement ? nameElement.textContent.trim() : "",
                    price: priceElement ? priceElement.textContent.trim() : "",
                    image: imageElement ? imageElement.src : ""
                };
            });
        });
        // output the result data
        console.log(products);
    }

    (async () => {

        // launch the browser in headless mode
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        // open the target page
        await page.goto("https://scrapingcourse.com/infinite-scrolling");

        // get the last scroll height
        let lastHeight = 0;

        while (true) {
            // scroll to bottom
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight);");

            // wait for the page to load
            await new Promise(resolve => setTimeout(resolve, 10000));

            // get the new height value
            const newHeight = await page.evaluate("document.body.scrollHeight");

            // break the loop if there are no more heights to scroll
            if (newHeight === lastHeight) {

                // extract data once all content has loaded
                await scraper(page);

                break;
            }

            // update the last height to the new height
            lastHeight = newHeight;
        }

        // close the browser
        await browser.close();
        })();

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