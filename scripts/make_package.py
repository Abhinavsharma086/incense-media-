import os
import zipfile

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
zip_path = os.path.join(root_dir, "deploy_package.zip")

print(f"Creating new deploy_package.zip at {zip_path}...")

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    # 1. Add dist/
    dist_dir = os.path.join(root_dir, "dist")
    for root, dirs, files in os.walk(dist_dir):
        for f in files:
            full_path = os.path.join(root, f)
            arcname = os.path.relpath(full_path, root_dir).replace("\\", "/")
            zf.write(full_path, arcname)

    # 2. Add backend/dist/
    backend_dist = os.path.join(root_dir, "backend", "dist")
    for root, dirs, files in os.walk(backend_dist):
        for f in files:
            full_path = os.path.join(root, f)
            arcname = os.path.relpath(full_path, root_dir).replace("\\", "/")
            zf.write(full_path, arcname)

    # 3. Add backend package.json if present
    pkg_file = os.path.join(root_dir, "backend", "package.json")
    if os.path.exists(pkg_file):
        zf.write(pkg_file, "backend/package.json")

print(f"[+] Successfully created deploy_package.zip ({os.path.getsize(zip_path) / (1024*1024):.2f} MB)")
