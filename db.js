# Railway injects DATABASE_URL automatically when you add the Postgres plugin.
# For local dev, point it at your own postgres:
DATABASE_URL=postgres://user:pass@localhost:5432/superteam

# REQUIRED in production — any long random string. Keeps logins valid across redeploys.
JWT_SECRET=change-me-to-a-long-random-string

# OPTIONAL — enables permanent worksheet file storage (free tier is fine).
# Get it from your Cloudinary dashboard ("API environment variable").
# Without it, files are stored on local disk and vanish on redeploy.
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
