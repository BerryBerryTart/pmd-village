/**
 * REQUIRES PATH.JS TO WORK
 * JUST KEEPING IT GIT IGNORED TO USE
 * MY RAMDISK BECAUSE OH MY GOODNESS ITS
 * A LOT OF FILES :'3
 **/

import fs from "node:fs";
import path from "node:path";
import { xml2json } from "xml-js";
import { createCanvas, loadImage } from "canvas";
import { open } from "node:fs/promises";
import { REPO_PATH, DESTINATION_PATH } from "./paths";

const validExts = /png|jpg|jpeg/;
const nameMap = new Map();
const exceptionArr = [];
const fullNameArr = [];

const nativeType = function (value) {
  let nValue = Number(value);
  if (!isNaN(nValue)) {
    return nValue;
  }
  let bValue = value.toLowerCase();
  if (bValue === "true") {
    return true;
  } else if (bValue === "false") {
    return false;
  }
  return value;
};

const removeJsonTextAttribute = function (value, parentElement) {
  try {
    const pOpKeys = Object.keys(parentElement._parent);
    const keyNo = pOpKeys.length;
    const keyName = pOpKeys[keyNo - 1];
    const arrOfKey = parentElement._parent[keyName];
    const arrOfKeyLen = arrOfKey.length;
    if (arrOfKeyLen > 0) {
      const arr = arrOfKey;
      const arrIndex = arrOfKey.length - 1;
      arr[arrIndex] = nativeType(value);
    } else {
      parentElement._parent[keyName] = nativeType(value);
    }
  } catch (e) {
    console.log(e);
  }
};

let options = {
  compact: true,
  nativeType: false,
  textFn: removeJsonTextAttribute,
};

const portraitImageMap = new Map([
  ["Normal", "0-0"],
  ["Happy", "0-1"],
  ["Pain", "0-2"],
  ["Angry", "0-3"],
  ["Worried", "0-4"],
  ["Sad", "1-0"],
  ["Crying", "1-1"],
  ["Shouting", "1-2"],
  ["Teary-Eyed", "1-3"],
  ["Determined", "1-4"],
  ["Joyous", "2-0"],
  ["Inspired", "2-1"],
  ["Surprised", "2-2"],
  ["Dizzy", "2-3"],
  ["Special0", "2-4"],
  ["Special1", "3-0"],
  ["Sigh", "3-1"],
  ["Stunned", "3-2"],
  ["Special2", "3-3"],
  ["Special3", "3-4"],
]);

const getExceptionSubfolder = (nameStr) => {
  switch (nameStr) {
    //base case exceptions
    case "oinkologne-m":
    case "basculegion-m":
    case "meowstic-m":
    case "indeedee-m":
    case "lycanroc-midday-form":
      return "";
    case "lycanroc-dusk-form":
    case "galarian-meowth":
      return "0002";
    //default
    default:
      return "0001";
  }
};

const extract = async (pokeNum, name = "", subfolder = "") => {
  const fullName = name || nameMap.get(pokeNum);
  //START SPRITES
  const originPath = path.join(REPO_PATH, "sprite", pokeNum, subfolder);
  const destination = path.join(DESTINATION_PATH, fullName);

  if (
    !(
      fs.existsSync(originPath) &&
      fs.existsSync(path.join(originPath, "Idle-Anim.png")) &&
      fs.existsSync(path.join(originPath, "Walk-Anim.png")) &&
      fs.existsSync(path.join(originPath, "AnimData.xml"))
    )
  ) {
    return;
  }

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, {
      recursive: true,
    });
  }
  try {
    const data = fs.readFileSync(path.join(originPath, "AnimData.xml"), "utf8");
    const jsonRaw = xml2json(data, options);
    const jsonParsed = JSON.parse(jsonRaw);
    const json = jsonParsed.AnimData.Anims.Anim.filter(
      (el) => el.Name === "Walk" || el.Name === "Idle",
    );
    jsonParsed.AnimData.Anims.Anim = json;
    fs.writeFileSync(
      path.join(destination, "AnimData.json"),
      JSON.stringify(jsonParsed),
    );
  } catch (err) {
    console.error(err);
  }

  //copy sprite sheets
  try {
    fs.copyFileSync(
      path.join(originPath, "Idle-Anim.png"),
      path.join(destination, "Idle-Anim.png"),
    );
    fs.copyFileSync(
      path.join(originPath, "Walk-Anim.png"),
      path.join(destination, "Walk-Anim.png"),
    );
  } catch (err) {
    console.error(err);
  }
  //END SPRITES

  //START PROFILES
  let foundFiles = [];
  foundFiles.push(
    ...fs.readdirSync(path.join(REPO_PATH, "portrait", pokeNum, subfolder)),
  );
  foundFiles = foundFiles.filter((el) => validExts.test(el.split(".")[1]));

  const canvas = createCanvas(200, 160);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";

  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let file of foundFiles) {
    const name = file.split(".")[0];
    if (!name) continue;
    await loadImage(path.join(REPO_PATH, "portrait", pokeNum, subfolder, file))
      .then((image) => {
        //row = y; col= x
        const pos = portraitImageMap.get(name)?.split("-");
        if (!pos) return;
        const row = pos[0] * 40;
        const col = pos[1] * 40;
        ctx.drawImage(image, col, row, 40, 40);
      })
      .catch((e) => {
        console.log(`Couldn't Parse ${file}`);
        console.log(e);
      });
  }

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(destination, "portrait.png"), buffer);
  //END PROFILES

  //add name to array
  fullNameArr.push(`${pokeNum}|${fullName}`);
};

function cleanString(input) {
  let output = "";
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) <= 127) {
      output += input.charAt(i);
    }
  }
  return output;
}

const cleanName = (name) => {
  let buffer = name;
  //normalise and remove illegal characters
  buffer = buffer.toLowerCase().replace(/:/, "-").replace(".", "");
  buffer = buffer.replace("♀", "-f").replace("♂", "-m");
  buffer = cleanString(buffer);
  return buffer;
};

const setupNames = async () => {
  const nameFile = await open("./names.txt");
  for await (const line of nameFile.readLines()) {
    nameMap.set(
      line.split(",")[0].padStart(4, "0"),
      cleanName(line.split(",")[1]),
    );
  }
  await nameFile.close();

  const exceptionsFile = await open("./exceptions.txt");
  for await (const line of exceptionsFile.readLines()) {
    exceptionArr.push(
      `${line.split(",")[0].padStart(4, "0")}|${cleanName(line.split(",")[1])}`,
    );
  }
  await exceptionsFile.close();
};

const buildNames = () => {
  //enumerate valid names in json master list
  // let names = [];
  // names.push(...fs.readdirSync(DESTINATION_PATH));
  fs.writeFileSync(
    path.join(DESTINATION_PATH, "characters.json"),
    JSON.stringify({ characters: fullNameArr }),
  );
};

const processNames = async () => {
  const skips = ["0916", "0902", "0876", "0745", "0678"];
  let counter = 0;
  for (let [k, v] of nameMap) {
    if (!k || skips.includes(k)) continue;
    await extract(k).catch(() => console.log(`Error with ${v}`));
    counter++;
    if (counter % 100 === 0) {
      console.log(`Imported ${counter} Guys`);
    }
  }
};

const processExceptions = async () => {
  for (let name of exceptionArr) {
    const split = name.split("|");
    if (!split[0] && !split[0]) continue;
    const num = split[0];
    const str = split[1];
    const subFolder = getExceptionSubfolder(str);
    await extract(num, str, subFolder).catch(() =>
      console.log(`Error with ${str}`),
    );
  }
};

(async () => {
  //first setup
  if (!fs.existsSync(DESTINATION_PATH)) {
    fs.mkdirSync(DESTINATION_PATH, {
      recursive: true,
    });
  }

  await setupNames();
  await processNames();
  console.log("Processing Extras");
  await processExceptions();
  buildNames();
})();
