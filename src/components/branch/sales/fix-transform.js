const fs = require("fs");
const path = "src/components/branch/sales/BranchSalesPanel.tsx";
let s = fs.readFileSync(path, "utf8");
const OLD = "transform: `translateX(${[\"month\", \"week\", \"day\"].indexOf(salesViewMode) * 100}%)`";
const NEW = "transform: `translateX(${\"[\"}\\month, week, day${\"]\"}.indexOf(salesViewMode) * 100}%)`";
s = s.replace(OLD, NEW);
fs.writeFileSync(path, s);
console.log("done");