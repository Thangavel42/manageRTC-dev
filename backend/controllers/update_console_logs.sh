#!/bin/bash

# Array of files to update
files=(
  "employee/dashboard.controller.js"
  "employee/employee.controller.js"
  "user/user.socket.controller.js"
  "socialfeed/socialFeed.socket.controller.js"
  "socialfeed/socialFeed.controller.js"
  "tickets/tickets.controller.js"
  "tickets/tickets.socket.controller.js"
  "task/task.controller.js"
  "superadmin/companies.controller.js"
  "superadmin/package.controller.js"
  "superadmin/subscription.controller.js"
  "superadmin/superadmin.controller.js"
  "performance/promotion.controller.js"
  "project/project.controller.js"
  "project/project.notes.controller.js"
  "pipeline/pipeline.controllers.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Check if file has console statements
    console_count=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
    
    if [ "$console_count" -gt 0 ]; then
      echo "  Found $console_count console statements in $file"
      
      # Check if import already exists
      if ! grep -q "from '../../utils/logger.js'" "$file"; then
        # Find the first import line and add logger import after it
        sed -i '0,/^import/s//import { devLog, devDebug, devWarn, devError } from '\''..\/..\/utils\/logger.js'\'';\nimport/' "$file" 2>/dev/null || \
        sed -i '1s/^/import { devLog, devDebug, devWarn, devError } from '\''..\/..\/utils\/logger.js'\'';\n/' "$file"
      fi
      
      # Replace console statements
      sed -i 's/console\.log(/devLog(/g' "$file"
      sed -i 's/console\.error(/devError(/g' "$file"
      sed -i 's/console\.warn(/devWarn(/g' "$file"
      sed -i 's/console\.debug(/devDebug(/g' "$file"
      
      echo "  ✓ Updated $file"
    fi
  fi
done

echo "Done!"
