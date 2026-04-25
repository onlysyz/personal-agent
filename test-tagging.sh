#!/bin/bash
# Tagging system integration test

BASE_URL="http://localhost:3001/api"
PASS=0
FAIL=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo "✅ PASS: $2"
    ((PASS++))
  else
    echo "❌ FAIL: $2"
    ((FAIL++))
  fi
}

echo "=== Tagging System Integration Tests ==="
echo ""

# 1. Get initial state with tags
echo "1. Get knowledge status with tags..."
RESP=$(curl -s "$BASE_URL/knowledge")
echo "$RESP" | jq -e '.data.tags' > /dev/null 2>&1
test_result $? "Knowledge status includes tags array"

# 2. Upload with tags
echo "2. Upload document with tags..."
echo "# Test Doc" > /tmp/tag-test.md
RESP=$(curl -s -X POST "$BASE_URL/knowledge/ingest" \
  -F "file=@/tmp/tag-test.md;type=text/markdown" \
  -F 'tags=["test","integration"]')
echo "$RESP" | jq -e '.data.tags == ["test","integration"]' > /dev/null 2>&1
test_result $? "Upload accepts and returns tags"

# 3. Get all tags
echo "3. Get all unique tags..."
RESP=$(curl -s "$BASE_URL/knowledge/tags")
echo "$RESP" | jq -e '.data | length > 0' > /dev/null 2>&1
test_result $? "Tags endpoint returns array"

# 4. Update document tags
echo "4. Update document tags..."
DOC_ID=$(curl -s "$BASE_URL/knowledge/raw" | jq -r '.data[0].id')
if [ -n "$DOC_ID" ]; then
  RESP=$(curl -s -X PUT "$BASE_URL/knowledge/tags/$DOC_ID" \
    -H "Content-Type: application/json" \
    -d '{"tags":["updated","modified"]}')
  echo "$RESP" | jq -e '.data.tags == ["updated","modified"]' > /dev/null 2>&1
  test_result $? "Update tags endpoint works"
fi

# 5. Get documents by tag
echo "5. Get documents by tag..."
RESP=$(curl -s "$BASE_URL/knowledge/tags/machine-learning")
echo "$RESP" | jq -e '.code == 0' > /dev/null 2>&1
test_result $? "Get documents by tag works"

# 6. Query with tag filter
echo "6. Query with tag filter..."
RESP=$(curl -s -X POST "$BASE_URL/knowledge/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"what is machine learning", "tag":"machine-learning"}')
echo "$RESP" | jq -e '.data.filteredByTag == "machine-learning"' > /dev/null 2>&1
test_result $? "Query with tag filter returns filteredByTag"

# 7. Tags in document list
echo "7. Document list includes tags..."
RESP=$(curl -s "$BASE_URL/knowledge/raw")
echo "$RESP" | jq -e '.data[0] | has("tags")' > /dev/null 2>&1
test_result $? "Document list items have tags field"

# Cleanup
rm -f /tmp/tag-test.md

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ $FAIL -eq 0 ] && exit 0 || exit 1