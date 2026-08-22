#!/bin/sh
# Typst + RenderCV for server/agent runtime images.
#
# uv-managed CPython writes EXTERNALLY-MANAGED, so `uv pip install --system`
# fails. Install RenderCV into a venv and put binaries on PATH.
# Requires: wget, ca-certificates, xz-utils, uv, TARGETARCH (amd64|arm64).
set -eu

: "${TARGETARCH:?TARGETARCH is required}"

case "$TARGETARCH" in
  amd64)
    TYPST_TRIPLE=x86_64-unknown-linux-musl
    TYPST_SHA256=a6044cbad2a954deb921167e257e120ac0a16b20339ec01121194ff9d394996d
    ;;
  arm64)
    TYPST_TRIPLE=aarch64-unknown-linux-musl
    TYPST_SHA256=491b101aa40a3a7ea82a3f8a6232cabb4e6a7e233810082e5ac812d43fdcd47a
    ;;
  *)
    echo "unsupported TARGETARCH: ${TARGETARCH:-empty}" >&2
    exit 1
    ;;
esac

wget -qO /tmp/typst.tar.xz \
  "https://github.com/typst/typst/releases/download/v0.14.2/typst-${TYPST_TRIPLE}.tar.xz"
echo "${TYPST_SHA256}  /tmp/typst.tar.xz" | sha256sum -c
tar -xJf /tmp/typst.tar.xz -C /tmp
install -m755 "/tmp/typst-${TYPST_TRIPLE}/typst" /usr/local/bin/typst
rm -rf /tmp/typst.tar.xz "/tmp/typst-${TYPST_TRIPLE}"

export UV_PYTHON_INSTALL_DIR=/usr/local/share/uv/python
export UV_LINK_MODE=copy
VENV=/opt/rendercv

uv python install 3.12
uv venv "$VENV" --python 3.12
uv pip install --python "$VENV/bin/python" 'rendercv[full]==2.8'

if [ ! -x "$VENV/bin/rendercv" ]; then
  echo "rendercv not found after install" >&2
  exit 1
fi

# Extra symlinks to venv/bin/python resolve to the base interpreter and skip
# pyvenv.cfg. Wrappers exec the venv binary so site-packages stay on sys.path.
write_wrapper() {
  printf '#!/bin/sh\nexec %s "$@"\n' "$2" >"$1"
  chmod 755 "$1"
}
write_wrapper /usr/local/bin/python3 "$VENV/bin/python"
write_wrapper /usr/local/bin/python3.12 "$VENV/bin/python"
write_wrapper /usr/local/bin/python "$VENV/bin/python"
write_wrapper /usr/local/bin/rendercv "$VENV/bin/rendercv"

FONT_DIR="$("$VENV/bin/python" -c "import rendercv_fonts; print(rendercv_fonts.package_folder_path)")"
test -n "$FONT_DIR"
ln -sfn "$FONT_DIR" /usr/local/share/rendercv-fonts
chmod -R a+rX "$UV_PYTHON_INSTALL_DIR" "$VENV" /usr/local/share/rendercv-fonts

test -x /usr/local/bin/python3
test -x /usr/local/bin/python3.12
test -x /usr/local/bin/rendercv
test -x /usr/local/bin/typst
/usr/local/bin/python3 -c "import rendercv_fonts"
rm -f /usr/local/bin/uv
