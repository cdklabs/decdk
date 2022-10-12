#!/bin/bash
set -euo pipefail
scriptsdir=$(cd "$(dirname $0)" && pwd)
packagedir=$(cd ${scriptsdir}/../.. && pwd)

# Output
OUTPUT_DIR="${packagedir}/schema"
mkdir -p "${OUTPUT_DIR}"

node -e "require('${packagedir}/lib/scripts/bump-schema-version.js').bump()"