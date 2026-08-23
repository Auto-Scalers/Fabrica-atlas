// Wrapper to start mc-test2 Next.js server from any cwd
process.chdir("C:/Users/justs/Documents/mc-test2/mission-control");
process.argv = [process.argv[0], "dev", "-p", "3100"];
require("C:/Users/justs/Documents/mc-test2/mission-control/node_modules/next/dist/bin/next");
