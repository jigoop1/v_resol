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

// This function can run for a maximum of 300 seconds
export const config = {
  maxDuration: 300,
};

const waitTillHTMLRendered = async (page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while(checkCounts++ <= maxChecks){
	let html = await page.content();
	let currentHTMLSize = html.length;
	let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
	console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

	if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
	  countStableSizeIterations++;
	else
	  countStableSizeIterations = 0; //reset the counter

	if(countStableSizeIterations >= minStableSizeIterations) {
	  console.log("Page rendered fully..");
	  break;
	}

	lastHTMLSize = currentHTMLSize;
	await page.waitForTimeout(checkDurationMsecs);
  }
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

  // Set headers,else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://www.google.com/' });

  const logger: string[] = [];
  const finalResponse:{source:string,subtitle:string[]} = {source:'',subtitle:[]};
  // Define our blocked extensions
  const blockedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.svg'];

  // Use CDP session to block resources
  await page.client().send('Network.setBlockedURLs', { urls: blockedExtensions });

  await page.setRequestInterception(true);
  await page.on('requestfinished', async (request) => {
      var response = await request.response();
      try {
          if (request.redirectChain().length === 0) {
             var responseBody = await response.buffer();
             console.log(responseBody.toString());
          }
      }catch (err) { console.log(err); }
  });
  await page.on('request', request => {
      request.continue();
  });

  try {
	const [req] = await Promise.all([
	  	page.waitForRequest(req => req.url(), { timeout: 20000 }),
		console.log("We are going to " + iurl + ":"),
		// page.goto(`${iurl}?z=&_debug=true`, { waitUntil: 'domcontentloaded' }),
		await page.goto(`${iurl}?z=&_debug=true`, { waitUntil: ['domcontentloaded'] }),
		// page.goto(`${id}?z=&_debug=true`, { waitUntil: 'networkidle0' }),
		await page.waitForSelector(`${selector}`),
		// await page.click(`${selector}`),
		// await page.waitForSelector(".jw-state-playing"),
		await waitTillHTMLRendered(page),
		// const data = await page.content(),
		// await page.waitForNavigation({waitUntil: 'networkidle0', }),
		]);
  } catch (error) {
	  console.log(`Webhook Error: ${error.message}`),
	  // console.log('prisma before')
	  res.status(400).json({ error: `Webhook Error: ${error.message}` })
	  }
  await browser.close();

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