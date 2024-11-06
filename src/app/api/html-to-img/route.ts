import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require("puppeteer-core");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require("@sparticuz/chromium");

type RequestBody = {
  htmlBase64: string;
};

const fontBase64 =
  "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";

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

  let browser = null;
  const isDevelopment = process.env.NODE_ENV === "development";
  await chromium.font("../../fonts/FOT-Matisse-Pro-EB.woff");

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
            "--font-render-hinting=none",
            "--disable-font-subpixel-positioning",
            "--enable-font-antialiasing",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--font-render-hinting=medium",
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
    try {
      // Create CDP session for direct font control
      const cdp = await page.target().createCDPSession();
      await cdp.send("Page.setFontFamilies", {
        fontFamilies: {
          standard: "FOT-Matisse-Pro-EB",
          fixed: "FOT-Matisse-Pro-EB",
          serif: "FOT-Matisse-Pro-EB",
          sansSerif: "FOT-Matisse-Pro-EB",
          cursive: "FOT-Matisse-Pro-EB",
          fantasy: "FOT-Matisse-Pro-EB",
        },
      });

      // Set font loading
      await page.addStyleTag({
        content: `
            @font-face {
                font-family: 'FOT-Matisse-Pro-EB';
                src: url("data:font/woff;base64,${fontBase64}") format('woff');
                font-weight: normal;
                font-style: normal;
            }
            * {
                font-family: 'FOT-Matisse-Pro-EB' !important;
            }
          `,
      });

      await page.setContent(htmlContent, {
        waitUntil: ["networkidle0", "load", "domcontentloaded"],
        timeout: 30000,
      });
    } catch (error) {
      console.error("Error during font setup:", error);
    }

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
