#!/bin/sh
set -e

if [ -n "$EXPO_PUBLIC_HAPPY_SERVER_URL" ]; then
  cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__HAPPY_RUNTIME_CONFIG__={serverUrl:'$EXPO_PUBLIC_HAPPY_SERVER_URL'};
EOF

  if ! grep -q "runtime-config.js" /usr/share/nginx/html/index.html; then
    sed -i 's|</head>|<script src="/runtime-config.js"></script></head>|' /usr/share/nginx/html/index.html
  fi
fi

exec nginx -g 'daemon off;'
