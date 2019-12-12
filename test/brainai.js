
var brain = require('brain.js');
const fs = require('fs');


var net = new brain.NeuralNetwork();
 
net.train([{input: { r: 1, g: 1, b: 1 }, output: { black: 0.10 }},
           {input: { r: 0.16, g: 0.09, b: 0.2 }, output: { white: 0.90}},
           {input: { r: 0.0, g: 0.0, b: 0.0 }, output: { black: 0.90 }}]);
 
var output = net.run({ r: 1, g: 1, b: 1 });  // { white: 0.99, black: 0.002 }
console.log(output);
var output = net.run({ r: 0.2, g: 0.4, b: 0.6 });
console.log(output);
var output = net.run({ r: 0.5, g: 0.8, b: 0 });
console.log(output);
var output = net.run({ r: 1, g: 1, b: 1 });

fs.writeFile("test.json", JSON.stringify(net), function (err) {
  if (err)
    return console.log(err);
  console.log("The train file was saved");
});

console.log(output);