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
  maxDuration: 30,
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
  const selector = body.selector;
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
  };
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setRequestInterception(true);

  // Set headers,else wont work.
  await page.setExtraHTTPHeaders({ 'Referer': 'https://flixhq.to/' });

  const logger: string[] = [];
  const finalResponse:{source:string} = {source:''}
  // Define our blocked extensions
  const blockedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.svg'];

  // Use CDP session to block resources
  await page.client().send('Network.setBlockedURLs', { urls: blockedExtensions });

  page.on('request', async (request) => {
	  const response = await request.response();
	  const responseHeaders = response.headers();
	  let responseBody;
	  if (request.redirectChain().length === 0) {
	  	// Because body can only be accessed for non-redirect responses.
	  	 if (request.url()){
	  		responseBody = await response.buffer();
		}

		// You now have a buffer of your response, you can then convert it to string :
		finalResponse.source = responseBody.toString();
		// console.log(responseBody.toString());
	  }
	  } catch (error) {
			console.log(`Error extracting page iframe Error: ${error.message}`);
			// Handle the error appropriately
	    };

  try {
	const [req] = await Promise.all([
		page.goto(iurl, { waitUntil: 'domcontentloaded' , timeout: 60000 }),
		await page.waitForSelector(`${selector}`, { timeout: 5000 }),
		await page.click(`${selector}`, { timeout: 5000 }),
		// Extract the entire HTML content of the page
		// const pageHTML = await page.content(),
		// Identify the iframe using a selector or any other appropriate method

		// const jsonData = JSON.stringify({ trustpilotContent });
		// await page.waitForSelector(".jw-state-playing"),
		// await waitTillHTMLRendered(page),
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
//   finalResponse.source = responseBody
  res.json(finalResponse);
};