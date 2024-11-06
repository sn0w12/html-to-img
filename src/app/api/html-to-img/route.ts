import { NextResponse } from "next/server";
import { Browser } from "puppeteer-core";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require("puppeteer-core");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require("@sparticuz/chromium");

type RequestBody = { htmlBase64: string };

// Cache browser instance
let browserInstance: Browser | null = null;

async function getBrowser(isDevelopment: boolean) {
  if (browserInstance) return browserInstance;

  const puppeteerConfig = isDevelopment
    ? {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
        headless: "new",
        executablePath:
          "c:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        defaultViewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      }
    : {
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
        defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };

  browserInstance = await puppeteer.launch(puppeteerConfig);
  return browserInstance;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as RequestBody;
  const htmlBase64 = body.htmlBase64?.trim();

  if (!htmlBase64) {
    return NextResponse.json(
      { result: "error", data: "Missing html base64 content" },
      { status: 400 }
    );
  }

  let htmlContent;
  try {
    htmlContent = Buffer.from(htmlBase64, "base64").toString("utf-8");
  } catch (error) {
    return NextResponse.json(
      {
        result: "error",
        data: "Invalid base64 content: " + (error as Error).message,
      },
      { status: 400 }
    );
  }

  const isDevelopment = process.env.NODE_ENV === "development";
  let page = null;

  try {
    const browser = await getBrowser(isDevelopment);
    if (!browser) {
      return NextResponse.json(
        { result: "error", data: "Failed to create browser instance" },
        { status: 500 }
      );
    }
    page = await browser.newPage();

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on(
      "request",
      (req: {
        resourceType: () => string;
        abort: () => void;
        continue: () => void;
      }) => {
        if (["image", "stylesheet", "font"].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      }
    );

    // Concurrent setup operations
    await Promise.all([
      page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
      ),
      page.setContent(htmlContent, {
        waitUntil: ["domcontentloaded"],
        timeout: 15000,
      }),
    ]);

    // Simplified font loading check
    await page.evaluate(() => document.fonts.ready);

    const node = await page.$(".badge");
    if (!node) {
      return NextResponse.json(
        {
          result: "error",
          data: "Element with class badge not found in HTML content",
        },
        { status: 404 }
      );
    }

    const image = await node.screenshot({
      type: "png",
      omitBackground: true,
    });

    if (!image) {
      return NextResponse.json(
        { result: "error", data: "Failed to capture screenshot" },
        { status: 500 }
      );
    }

    return new Response(image, {
      headers: { "Content-Type": "image/png" },
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { result: "error", data: "Error generating image" },
      { status: 500 }
    );
  } finally {
    if (page) {
      await page.close();
    }
  }
}
