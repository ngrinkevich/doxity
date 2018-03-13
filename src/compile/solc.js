import fs from 'fs';
import childProcess from 'child_process';
import Config from 'truffle-config';
import Resolver from 'truffle-resolver';
import compile from 'truffle-compile';

export default function (src) {
  // detect if we're in a truffle project
  return new Promise((resolve) => {
    if (fs.existsSync(`${process.env.PWD}/truffle.js`)) {
      const config = Config.default();
      config.resolver = new Resolver(config);
      config.rawData = true;
      compile.all(config, (err, res) => {
        if (err) { throw err; }
        resolve({
          contracts: Object.keys(res).reduce((o, k) => {
            const { metadata, ...data } = res[k].rawData;
            try {
              const parsed = JSON.parse(metadata);
              const fN = Object.keys(parsed.settings.compilationTarget)[0];
              data.fileName = fN.indexOf(process.env.PWD) === 0 ? fN : `${process.env.PWD}/node_modules/${fN}`;
              data.output = parsed.output;
            } catch (e) {
              console.log(`⚠️ Error parsing Contract: ${k}`);
            }
            return {
              ...o,
              [k]: data,
            };
          }, {}),
        });
      });
    } else {
      const exec = `solc --combined-json abi,asm,ast,bin,bin-runtime,clone-bin,devdoc,interface,opcodes,srcmap,srcmap-runtime,userdoc ${src}`;
      const res = JSON.parse(childProcess.execSync(exec));

      // TODO: cleanup this mess
      const contracts = {};
      Object.keys(res.contracts).reduce(function (o, k) {
        var file = k.split(':')[0];
        var fileFragments = file.split('/');
        var contractName = k.split(':')[1]
        var contract = res.contracts[k];
        var fileName = fileFragments[fileFragments.length - 1].split('.sol')[0];
        
        if (fileName === contractName) {
          contracts[contractName] = {
            fileName: `${process.env.PWD}/${k.split(':')[0]}`,
            abi: JSON.parse(contract.abi),
            devdoc: JSON.parse(contract.devdoc),
            userdoc: JSON.parse(contract.userdoc)
          }
        }
      });

      resolve({
        contracts: contracts
      });

      // resolve({
      //   contracts: Object.keys(res.contracts).reduce((o, k) => {
      //     const file = k.split(':')[0];
      //     const fileFragments = file.split('/');
      //     const contractName = fileFragments[fileFragments.length - 1].split('.sol')[0];
      //     const contract = res.contracts[k];
      //     const fileName = `${process.env.PWD}/${k.split(':')[0]}`;
      //     return {
      //       ...o,
      //       [contractName]: {
      //         ...contract,
      //         fileName,
      //         abi: JSON.parse(contract.abi),
      //         devdoc: JSON.parse(contract.devdoc),
      //         userdoc: JSON.parse(contract.userdoc),
      //       },
      //     };
      //   }, {}),
      // });
    }
  });
}
