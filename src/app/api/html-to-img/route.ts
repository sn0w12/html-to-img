import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require("puppeteer-core");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require("@sparticuz/chromium");
import path from "path";
import fs from "fs/promises";

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

  let browser = null;
  const isDevelopment = process.env.NODE_ENV === "development";
  const fontPath = path.join(
    process.cwd(),
    "src/app/fonts/FOT-Matisse-Pro-EB.woff"
  );
  const normalizedPath = fontPath.replace(/^[A-Z]:/i, "");
  const fontContent = await fs.readFile(normalizedPath);
  const fontBase64 = fontContent.toString("base64");

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
    await page.evaluateOnNewDocument(`
        @font-face {
          font-family: 'FOT-Matisse-Pro-EB';
          src: url('data:application/x-font-woff;charset=utf-8;base64,${fontBase64}') format('woff');
          font-display: block;
        }
      `);

    await page.setContent(htmlContent, {
      waitUntil: ["networkidle0", "load", "domcontentloaded"],
      timeout: 30000,
    });

    // Inject styles with multiple approaches
    await page.addStyleTag({
      content: `
          @font-face {
            font-family: 'FOT-Matisse-Pro-EB';
            src: url('data:application/x-font-woff;charset=utf-8;base64,${fontBase64}') format('woff');
            font-display: block;
          }
          * {
            font-family: 'FOT-Matisse-Pro-EB' !important;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
        `,
    });

    // Wait for font to load
    await page.evaluateHandle(() => {
      return document.fonts.ready.then(() => {
        return new Promise((resolve) => {
          // Additional delay to ensure font rendering
          setTimeout(resolve, 1000);
        });
      });
    });

    // Force font reload
    await page.evaluate(() => {
      document.fonts.ready.then(() => {
        document.body.style.opacity = "0.99";
        setTimeout(() => {
          document.body.style.opacity = "1";
        }, 0);
      });
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
