var instructions = {
    ADDC: {opcode: "00000", fields : ["reg", "reg"]},
    SUBB: {opcode: "00001", fields : ["reg", "reg"]},
    AND: {opcode: "00010", fields : ["reg", "reg"]},
    OR: {opcode: "00011", fields : ["reg", "reg"]},
    MOVR: {opcode: "00100", fields : ["reg", "reg"]},
    MOVIL: {opcode: "00101", fields : ["8bits", "reg"]},
    MOVIU: {opcode: "00110", fields : ["8bits", "reg"]},
    JMP: {opcode: "00111", fields : ["8bits"]},
    MACRO: {macro: true, expansion : [
        "ADDC,${fields[0]},${fields[1]}",
        "SUBB,${fields[0]},${fields[1]}"
    ]}
};
var regLUT = {
    R0: "000",
    R1: "001",
    R2: "010",
    R3: "011",
    R4: "100",
    R5: "101",
    R6: "110",
    R7: "111"
};
var instrLength = 16;
var errors = [];
var program = [];
var labels = {};

function convert() {
    errors = [];
    program = [];
    labels = {};

    // expand macros convert to bits
    var lines = document.getElementById("input").value.split("\n");
    for (var i = 0; i < lines.length; i++) {
        lineToBits(lines[i]);
    }
    // evaluate labels and pad with 0s
    for (var i = 0; i < program.length; i++) {
        program[i] = eval('`' + program[i] + '`');
        program[i] = program[i].padEnd(instrLength,"0");
    }
    document.getElementById("output").value = program.join("\n");
    // init code for block ram
    document.getElementById("outputTemplate").value = generateTemplate();
};

function lineToBits(line) {
    var bits = "";
    // remove all whitespace
    line = line.replace(/\s+/g, '')
    // return if the line is commented out
    if (line.substring(0,2) == "--") {
        return;
    }
    // check if there is a label
    var labelSplit = line.split(":");
    if (labelSplit.length > 1) {
        var lineNum = program.length.toString();
        // store the line number of the label in binary, indexed by the label string
        labels[labelSplit[1]] = formatLiteral(lineNum,8);
    }

    fields = labelSplit[0].split(",");

    // get the operation name
    // shift removes and returns first element
    var op = fields.shift();
    // get the instruction definition
    var instr = instructions[op];

    // if it expands to multiple lines, evalMacro will recursively call this function again
    if (instr.macro) {
        evalMacro(instr, fields);
        return;
    }

    // add the opcode to the bits
    bits += instr.opcode;
    // loop over the rest of the fields
    for (var i=0; i<=instr.fields.length; i++) {
        // handle each field type
        switch (instr.fields[i]) {
            case "reg":
                bits += regLUT[fields[i]];
                break;
            case "8bits":
                bits += formatLiteral(fields[i], 8);
                break;
            case "h": 
                bits += formatLiteral(fields[i], 5);
                break;
            default:
                break;
        }
    }
    program.push(bits);
};

// number can be in decimal or hex (eg 0x123) or binary (0b), or label (starts with letter)
function formatLiteral(literal, numBits) {
    var number;
    // treat as label if first character is a letter
    if (literal.substring(0,1).match(/[a-z]/i) && numBits == 8) {
        return "${labels['" + literal + "']}";
    }
    else if (literal.substring(0,2) == "0b") {
        // parse binary
        number = parseInt(literal.substring(2), 2);
    }
    else {
        // parse dec and hex
        var number = parseInt(literal);
    }
    // convert to binary
    var str = number.toString(2);
    // shorten or lengthen as needed
    if (str.length > numBits) {
        errors.push("literal " + literal + " too big to fit in " + numBits + " bits.");
        return str.substring(0,numBits);
    }
    else {
        return str.padStart(numBits, "0");
    }
}

// Expand macro intsruction into multiple instructions
function evalMacro(macro, fields) {
    for (var i=0; i<macro.expansion.length; i++) {
        // evaluate thee macro string template
        var instrString = eval('`' + macro.expansion[i] + '`');
        // add that instruction to the program
        lineToBits(instrString);
    }
}

// Format some other way
function generateTemplate() {
    var template = [];
    var bitsPerLine = 256;
    var numLines = (program.length * instrLength) / bitsPerLine;
    for (var i=0; i<numLines; i++) {
        var line = "";
        for (var j=0; j<bitsPerLine/instrLength; j++) {
            var programIndex = i*instrLength + j;
            if (programIndex >= program.length) break;
            line += binToHex(program[programIndex]);
        }
        line = "INIT_" + i.toString(16).padStart(2,"0") + '=> X"' + line.padEnd(bitsPerLine/4,"0") + '"';
        template.push(line);
    }
    return template.join(",\n");
}

function binToHex(bin) {
    return parseInt(bin,2).toString(16);
}

// Save state across refreshes
window.onbeforeunload = function() {
    localStorage.setItem("program", document.getElementById("input").value);
}
window.onload = function() {
    var program = localStorage.getItem("program");
    if (name !== null) document.getElementById("input").value = program;
}