# audvy.me

Audvy’s research and engineering portfolio. The site uses static HTML, CSS, and browser JavaScript. The interactive Neuropoly artwork lives in `scripts/neuropoly.js`. The IPv4 tool at [ip.audvy.me/api](https://ip.audvy.me/api) is hosted separately.

Run a local server from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

## Prepare an S3 release

Create and unpack the archive into a fresh staging directory:

```sh
stage="$(mktemp -d)"
python3 scripts/package-site.py "$stage/audvy-site.zip"
unzip "$stage/audvy-site.zip" -d "$stage/site"
```

The package script includes the HTML pages and their public assets, including legacy image paths. Add new public files to its list before packaging. Upload the contents of `$stage/site` to the bucket root so `index.html`, `styles.css`, and `projects/neuropoly.html` are objects with those exact keys.

For an S3 **website endpoint**, enable static website hosting with `index.html` as the index document and `404.html` as the error document. The website endpoint needs anonymous read access to the website objects and serves HTTP. Keep the existing HTTPS front end for `https://audvy.me`. For a new HTTPS setup, CloudFront can instead serve a private S3 bucket through origin access control, with `index.html` as the default root object and a custom error response using `/404.html`.

With AWS CLI credentials for the intended website bucket, review the upload first:

```sh
aws s3 sync "$stage/site/" "s3://${AUDVY_WEBSITE_BUCKET:?Set AUDVY_WEBSITE_BUCKET}" --dryrun
```

Remove `--dryrun` to upload. Keep the AWS CLI’s inferred content types or verify them explicitly if using another uploader. The browser requires a JavaScript content type for `scripts/*.js`. Refresh any cached pages or assets at the HTTPS front end after uploading. Check the homepage, a project page opened directly, and a missing URL at the deployed hostname.
