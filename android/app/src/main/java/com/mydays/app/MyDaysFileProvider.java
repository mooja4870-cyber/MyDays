package com.mydays.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.File;
import java.io.FileNotFoundException;

public class MyDaysFileProvider extends ContentProvider {
    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        String path = uri.getPath();
        if (path == null) {
            throw new FileNotFoundException("URI path is null");
        }

        // Remove leading slash
        if (path.startsWith("/")) {
            path = path.substring(1);
        }

        // Security check: Prevent path traversal
        if (path.contains("..") || path.contains("/") || path.contains("\\")) {
            throw new FileNotFoundException("Security error: Invalid path segments");
        }

        File uploadDir = new File(getContext().getCacheDir(), "mydays_photo_uploads");
        File file = new File(uploadDir, path);

        if (!file.exists()) {
            throw new FileNotFoundException("Cache file not found on disk: " + file.getAbsolutePath());
        }

        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public String getType(Uri uri) {
        String path = uri.getPath();
        if (path == null) return "image/jpeg";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
