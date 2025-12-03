# Image Upload & Post Feature Guide

## Overview
You can now upload images to your backend and use them in Facebook posts. This guide covers setup and usage.

## Backend Changes

### 1. New Endpoints
- `POST /api/images/upload` - Upload an image (multipart/form-data)
  - Accepts: jpg, jpeg, png, gif, webp
  - Max size: 10MB
  - Returns: `{ url, fileName, originalName, size, uploadedAt }`

- `GET /api/images/saved` - Get list of uploaded images
  - Returns: `{ images: [{ url, fileName, size, uploadedAt }] }`

- `DELETE /api/images/saved/{fileName}` - Delete an uploaded image

### 2. Static File Serving
- Images are served from `/uploads` path
- Files stored in `AgentApi/uploads/` directory (created automatically)

### 3. MCP Integration
- When an image is selected, the post uses `post_image_to_facebook` action
- Sends `image_url` and `caption` parameters to Facebook MCP service

## Frontend Changes

### ImagePreferencesPage (`/imagepreference`)
**New Features:**
- File upload button at top of "Your Saved Images" section
- Image gallery showing all uploaded images with delete buttons
- Displays file size and filename
- Hover effects and confirmation dialogs

### FacebookPostPage (`/facebook-post`)
**New Features:**
- Image selector grid below the text input
- Shows all saved images as thumbnails
- "No Image" option (X button) to post text-only
- Selected image indicator with checkmark
- Blue notification when image is selected
- Link to Image Preferences page if no images available

## Usage Flow

### 1. Upload Images
```
1. Navigate to Image Preferences page (/imagepreference)
2. Click "Upload Image" button in "Your Saved Images" section
3. Select an image file (jpg, png, gif, webp, max 10MB)
4. Image appears in the gallery below
5. Optionally delete images using the trash icon (hover to see)
```

### 2. Create Post with Image
```
1. Navigate to Facebook Post page (/facebook-post)
2. Enter your post description/message
3. Select an image from the grid (or select X for text-only)
4. Click "Get Post Recommendation"
5. Review the AI-generated caption
6. Click "Post to Facebook"
7. The MCP service will post the image + caption to Facebook
```

## Testing

### Test Image Upload (PowerShell)
```powershell
$token = "<your_access_token>"
$imagePath = "C:\path\to\your\image.jpg"

curl.exe -X POST http://localhost:8000/api/images/upload `
  -H "Authorization: Bearer $token" `
  -F "file=@$imagePath"
```

### Test List Saved Images
```powershell
curl.exe -X GET http://localhost:8000/api/images/saved `
  -H "Authorization: Bearer $token"
```

### Test Delete Image
```powershell
curl.exe -X DELETE http://localhost:8000/api/images/saved/{fileName} `
  -H "Authorization: Bearer $token"
```

### Test Post with Image
```powershell
curl -X POST http://localhost:8000/api/agent/chat `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{
    "userMessage": "ACTION: post_image_to_facebook
PARAMETERS:
image_url=http://localhost:8000/uploads/abc123.jpg
caption=Check out this amazing image!
EXPLANATION: Posting an image with caption.",
    "model": "gpt-oss-120b",
    "conversationHistory": []
  }'
```

## Rebuild & Run

### Rebuild Backend (if needed)
```powershell
docker-compose build web
docker-compose up -d web
```

### Rebuild Frontend
```powershell
docker-compose build client
docker-compose up -d client
```

### Or rebuild everything
```powershell
docker-compose down
docker-compose up -d --build
```

## Notes

- Images are persisted in the `AgentApi/uploads/` directory on the host
- To preserve images across container rebuilds, consider mounting a volume for `/app/uploads`
- Authorization is required for all image endpoints (uses Bearer token)
- Frontend uses the same auth token retrieval as other API calls
- Image URLs are absolute (include scheme and host) for Facebook compatibility

## Troubleshooting

### "No saved images" in FacebookPostPage
- Check that images uploaded successfully in ImagePreferencesPage
- Verify backend is running and accessible
- Check browser console for API errors
- Confirm token is valid (re-login if expired)

### Upload fails
- Check file size (max 10MB)
- Verify file type (jpg, png, gif, webp only)
- Ensure backend has write permissions for uploads directory
- Check authorization token is present

### Images not displaying
- Verify static file middleware is configured (Program.cs)
- Check uploads directory exists and has images
- Verify image URLs are correct (scheme + host + path)
- Check CORS settings allow image requests
