import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require("puppeteer-core");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require("@sparticuz/chromium");

type RequestBody = {
  htmlBase64: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as RequestBody;
  const htmlBase64 = body.htmlBase64?.trim();

  if (!htmlBase64) {
    return NextResponse.json(
      {
        result: "error",
        data: "Missing html base64 content",
      },
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
  console.log("HTML content:", htmlContent);

  let browser = null;
  chromium.font(
    "https://github.com/Thisisdotme/frontend-design-assets/raw/refs/heads/master/clint-eastwood/fonts/Times-New-Roman-Subsetted.woff"
  );
  const isDevelopment = process.env.NODE_ENV === "development";

  try {
    const puppeteerConfig = isDevelopment
      ? {
          args: [
            "--font-render-hinting=none",
            "--disable-font-subpixel-positioning",
            "--enable-font-antialiasing",
          ],
          headless: "new",
          executablePath:
            "c:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          defaultViewport: {
            width: 1280,
            height: 720,
          },
          ignoreHTTPSErrors: true,
        }
      : {
          args: [
            ...chromium.args,
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--disable-web-security",
            "--single-process",
          ],
          defaultViewport: {
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
          },
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        };

    browser = await puppeteer.launch(puppeteerConfig);

    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: ["networkidle0", "load", "domcontentloaded"],
      timeout: 30000,
    });

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

    const image = await node.screenshot({ type: "png" });
    if (!image) {
      return NextResponse.json(
        {
          result: "error",
          data: "Failed to capture screenshot",
        },
        { status: 500 }
      );
    }
    return new Response(image, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        result: "error",
        data: "Error generating image",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
