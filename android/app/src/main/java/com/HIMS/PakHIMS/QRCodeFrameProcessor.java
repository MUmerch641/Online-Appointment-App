package com.pakhims;

import android.graphics.ImageFormat;
import android.graphics.Rect;
import android.media.Image;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.HybridBinarizer;
import com.mrousavy.camera.frameprocessor.Frame;
import com.mrousavy.camera.frameprocessor.FrameProcessorPlugin;

public class QRCodeFrameProcessor extends FrameProcessorPlugin {
    private final MultiFormatReader reader = new MultiFormatReader();

    @Override
    public Object callback(Frame frame, Object[] params) {
        Image image = frame.getImage();
        if (image == null || image.getFormat() != ImageFormat.YUV_420_888) {
            return null;
        }

        int width = image.getWidth();
        int height = image.getHeight();
        byte[] nv21Data = convertYUV420ToNV21(image);

        PlanarYUVLuminanceSource source = new PlanarYUVLuminanceSource(
                nv21Data, width, height, 0, 0, width, height, false);
        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

        try {
            Result result = reader.decode(bitmap);
            if (result != null) {
                return result.getText(); // Return the scanned QR code data
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private byte[] convertYUV420ToNV21(Image image) {
        Image.Plane[] planes = image.getPlanes();
        byte[] data = new byte[image.getWidth() * image.getHeight() * 3 / 2];
        byte[] yData = planes[0].getBuffer().array();
        byte[] uvData = new byte[planes[1].getBuffer().limit()];
        planes[1].getBuffer().get(uvData);

        System.arraycopy(yData, 0, data, 0, yData.length);
        System.arraycopy(uvData, 0, data, yData.length, uvData.length);
        return data;
    }
}