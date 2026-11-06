const fs = require('fs');
const css = fs.readFileSync('public/styles.css', 'utf8');

// Find backdrop-filter rules and their selectors
const rules = css.split('}');
const heavyRules = [];

rules.forEach(rule => {
  if (rule.includes('backdrop-filter')) {
    const parts = rule.split('{');
    if (parts.length >= 2) {
      heavyRules.push({
        selector: parts[0].trim().replace(/\s+/g, ' '),
        body: parts[1].trim()
      });
    }
  }
});

console.log('Total rules with backdrop-filter:', heavyRules.length);
console.log('Sample heavy rules:');
heavyRules.slice(0, 15).forEach(r => console.log(' - ' + r.selector));
