import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require("puppeteer-core");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require("@sparticuz/chromium");
import { Browser } from "puppeteer-core";

type RequestBody = {
    htmlBase64: string | string[];
};

export const maxDuration = 30;

function isSingleHtml(html: string | string[]): html is string {
    return typeof html === "string";
}

async function processHtml(
    htmlBase64: string,
    browser: Browser
): Promise<Buffer | null> {
    if (!htmlBase64?.trim()) {
        throw new Error("Missing html base64 content");
    }

    let htmlContent;
    try {
        htmlContent = Buffer.from(htmlBase64, "base64").toString("utf-8");
    } catch (error) {
        throw new Error("Invalid base64 content: " + (error as Error).message);
    }

    const page = await browser.newPage();
    await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36"
    );
    await page.setContent(htmlContent, {
        waitUntil: ["networkidle0", "load", "domcontentloaded"],
        timeout: 30000,
    });

    await page.evaluate(() => {
        return new Promise((resolve) => {
            if (document.fonts.status === "loaded") {
                resolve(true);
            } else {
                document.fonts.ready.then(() => resolve(true));
            }
        });
    });

    await page.evaluate(() => {
        document.body.style.opacity = "0.99";
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                document.body.style.opacity = "1";
                resolve(true);
            });
        });
    });

    const node = await page.$(".badge");
    if (!node) {
        throw new Error("Element with class badge not found in HTML content");
    }

    const image = (await node.screenshot({ type: "png" })) as Buffer;
    await page.close();
    return image;
}

export async function POST(request: Request): Promise<Response> {
    const body = (await request.json()) as RequestBody;
    const htmlBase64 = body.htmlBase64;

    if (!htmlBase64) {
        return NextResponse.json(
            { result: "error", data: "Missing html base64 content" },
            { status: 400 }
        );
    }

    let browser: Browser | null = null;
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
                  defaultViewport: { width: 1280, height: 720 },
                  ignoreHTTPSErrors: true,
              }
            : {
                  args: [
                      ...chromium.args,
                      "--enable-font-antialiasing",
                      "--enable-lcd-text",
                      "--font-render-hinting=none",
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
        if (!browser) {
            return NextResponse.json(
                { result: "error", data: "Failed to launch browser" },
                { status: 500 }
            );
        }

        if (isSingleHtml(htmlBase64)) {
            const image = await processHtml(htmlBase64, browser);
            if (!image) {
                return NextResponse.json(
                    { result: "error", data: "Failed to capture screenshot" },
                    { status: 500 }
                );
            }
            return new Response(image, {
                headers: { "Content-Type": "image/png" },
            });
        } else {
            const images = await Promise.all(
                htmlBase64.map((html) => processHtml(html, browser as Browser))
            );

            if (images.some((img) => !img)) {
                return NextResponse.json(
                    {
                        result: "error",
                        data: "Failed to capture one or more screenshots",
                    },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                result: "success",
                data: images.map((img) =>
                    Buffer.from(img as Buffer).toString("base64")
                ),
            });
        }
    } catch (error) {
        console.error("Error generating image:", error);
        return NextResponse.json(
            {
                result: "error",
                data: (error as Error).message || "Error generating image",
            },
            { status: 500 }
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
