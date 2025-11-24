import { NextRequest, NextResponse } from 'next/server';
import { parseLinePolishOCR } from '@/lib/ocrParser-v2';

export async function POST(request: NextRequest) {
  try {
    console.log('📸 OCR API: Received image upload request');
    
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.error('❌ No image file provided');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    
    console.log('📸 OCR API: Image file received -', imageFile.name, imageFile.size, 'bytes');

    // Check if API key is configured
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Cloud Vision API key not configured' },
        { status: 500 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json();
      console.error('Google Vision API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to process image with Google Vision API', details: errorData },
        { status: 500 }
      );
    }

    const visionData = await visionResponse.json();
    
    // Extract text from response
    const textAnnotations = visionData.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return NextResponse.json(
        { error: 'No text detected in image' },
        { status: 400 }
      );
    }

    // The first annotation contains the full text
    const extractedText = textAnnotations[0].description;
    console.log('✅ OCR API: Extracted text successfully');
    console.log('Extracted OCR Text:', extractedText);

    // Parse the extracted text
    console.log('🔍 OCR API: Starting parsing...');
    const parsedData = parseLinePolishOCR(extractedText);
    console.log('🔍 OCR API: Parsing complete. Found', parsedData.length, 'shift(s)');

    if (parsedData.length === 0) {
      console.error('❌ OCR API: No data could be parsed from text');
      return NextResponse.json(
        { 
          error: 'Could not parse line polish data from image',
          extractedText,
          parsedData: [],
          suggestion: 'Please try again with a clearer photo or enter data manually'
        },
        { status: 200 } // Changed to 200 so frontend still gets the data
      );
    }

    console.log('✅ OCR API: Success! Returning parsed data');
    return NextResponse.json({
      success: true,
      extractedText,
      parsedData,
      message: `Successfully extracted ${parsedData.length} shift(s) with ${parsedData[0]?.activities.length || 0} activities`
    });

  } catch (error: any) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error.message },
      { status: 500 }
    );
  }
}
