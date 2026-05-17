package com.mydays.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 7012;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " MyDaysAndroid/1.8.0");

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }

                filePathCallback = callback;

                Intent intent;
                intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                intent.setType("image/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] results = null;

        if (resultCode == RESULT_OK && data != null) {
            List<Uri> selectedUris = new ArrayList<>();

            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                for (int i = 0; i < count; i++) {
                    selectedUris.add(data.getClipData().getItemAt(i).getUri());
                }
            } else if (data.getData() != null) {
                selectedUris.add(data.getData());
            }

            if (!selectedUris.isEmpty()) {
                results = copyPickedImagesToCache(selectedUris);
            }
        }

        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    private Uri[] copyPickedImagesToCache(List<Uri> sourceUris) {
        List<Uri> cacheUris = new ArrayList<>();
        File uploadDir = new File(getFilesDir(), "mydays_photo_uploads");

        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        File[] staleFiles = uploadDir.listFiles();
        if (staleFiles != null) {
            for (File staleFile : staleFiles) {
                staleFile.delete();
            }
        }

        for (int i = 0; i < sourceUris.size(); i++) {
            Uri sourceUri = sourceUris.get(i);

            try {
                getContentResolver().takePersistableUriPermission(
                        sourceUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                );
            } catch (Exception ignored) {
                // Some providers do not allow persistable grants. Cache copy below is enough.
            }

            String extension = getImageExtension(sourceUri);
            File targetFile = new File(uploadDir, "mydays_photo_" + System.currentTimeMillis() + "_" + i + extension);

            try (
                    InputStream inputStream = getContentResolver().openInputStream(sourceUri);
                    OutputStream outputStream = new FileOutputStream(targetFile)
            ) {
                if (inputStream == null) {
                    continue;
                }

                byte[] buffer = new byte[8192];
                int length;
                while ((length = inputStream.read(buffer)) > 0) {
                    outputStream.write(buffer, 0, length);
                }

                cacheUris.add(new Uri.Builder()
                        .scheme("content")
                        .authority("com.mydays.app.fileprovider")
                        .path(targetFile.getName())
                        .build());
            } catch (Exception copyError) {
                copyError.printStackTrace();
            }
        }

        return cacheUris.toArray(new Uri[0]);
    }

    private String getImageExtension(Uri uri) {
        String mimeType = getContentResolver().getType(uri);

        if ("image/png".equals(mimeType)) {
            return ".png";
        }

        if ("image/webp".equals(mimeType)) {
            return ".webp";
        }

        if ("image/heic".equals(mimeType) || "image/heif".equals(mimeType)) {
            return ".heic";
        }

        return ".jpg";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
