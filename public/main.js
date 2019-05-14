// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container
const app = new PIXI.Application(window.innerWidth, window.innerHeight, {transparent: true});
var hexagonRadius = 60;
var hexagonHeight = hexagonRadius * Math.sqrt(3);
// The application will create a canvas element for you that you
// can then insert into the DOM
var socket = io();
document.body.appendChild(app.view);

class Player{
    constructor(name, surname){
        this.promisesLeft = [5, 5, 5];
        this.promisesInitial = [5, 5, 5]; // It is the promises that were available before investment.
        this.name = name;
        this.surname = surname;
        this.id = -1;
        this.occupiedCities = new Map();
        this.totalPop = 0;
    }

}
class Investment{
    constructor(){
        this.id = -1;
        this.promise = [0,0,0];
        this.selectedCity = -1;
        this.isOwn = false;
        this.totalPop = 0;
    }
}

class CityClient{
    constructor(id, name, primary, population){
        this.id = id;
        this.name = name;
        this.primary = primary;
        this.population = population;
    }
}

let instructionIndex = 0;
let instructions = ["Select only one of the cities that are in bold.", "Click on the promises that you want to invest as much as you want",
                        "Click Ready when you are ready!"]
const promisesDict = ["🎓", "🏥", "🚋"];
let investment = new Investment();
let button = new PIXI.Text("Ready");
let player = new Player("Ziya", "Erkoc");
let eduText = new PIXI.Text("🎓 Promises Left: " + player.promisesLeft[0]);
let healthText = new PIXI.Text("🏥 Promises Left: " + player.promisesLeft[1]);
let transportText = new PIXI.Text("🚋 Promises Left: " + player.promisesLeft[2]);
let selectionText = new PIXI.Text("You did not select any city!", {"fontSize" : "22px"});
let turnText = new PIXI.Text("Turn # 1");
let playerText = new PIXI.Text("You are Player # -1");
let popText = new PIXI.Text("Total 🗳️: " + 0 + "K");
let gameStatText = new PIXI.Text("");
let rulesText = new PIXI.Text("?", {"fontSize": '40px', "fontWeight": 'bold'});
let instructionsText = new PIXI.Text("Instruction: " + instructions[instructionIndex], {"fontSize": "20px"});
let rules = "Each of your promises are counted as 1 point,\nwhile each primary promise that you invested are counted as 2 points"
            + "\n\nTotal point is used to determine who acquired the city"
            + "\n\nCities that you can invest on are in bold"
            + "\n\nYour cities are colored in green" 
            + "\n\nOpponent cities are colored in red"
            + "\n\nIf you want to invest on a city, then you must have acquired a city in the outer circle"
            + "\n\nYou may even lose a city, if your neighbour outer cities are also lost."
            + "\n\nIf you had invested on a city which is given up by another player, \nyou can acquire that city only if your score is higher.";
let cityOwnerShips = [];

let cities = [];
let investmentTexts = [];
function initUI(){
    button.interactive = true;
    button.on('mousedown', () => {
        investment.totalPop = player.totalPop;
        console.log(investment);
        console.log(player);
        if(investment.selectedCity == -1){
            return;
        }
        instructionsText.text = "";
        socket.emit('investment', investment);
        investment.selectedCity = -1;
        selectionText.text = "Waiting for the opponents' turn!";
        investment.promise = [0, 0, 0];
        
        setButtonActive(false);
    });

    eduText.x = 800;
    eduText.y = 150;
    app.stage.addChild(eduText);

    healthText.x = 800;
    healthText.y = 200;
    app.stage.addChild(healthText);

    transportText.x = 800;
    transportText.y = 250;
    app.stage.addChild(transportText);

    selectionText.x = 800;
    selectionText.y = 50;
    app.stage.addChild(selectionText);

    turnText.x = 800;
    turnText.y = 350;
    app.stage.addChild(turnText);

    playerText.x = 800;
    playerText.y = 400;
    app.stage.addChild(playerText);

    popText.x = 800;
    popText.y = 450;
    app.stage.addChild(popText);

    gameStatText.x = 800;
    gameStatText.y = 500;
    app.stage.addChild(gameStatText);

    rulesText.x = 660;
    rulesText.y = 50;
    rulesText.interactive = true;
    app.stage.addChild(rulesText);

    instructionsText.x = 160;
    instructionsText.y = 0;
    blinkInstruction();
    app.stage.addChild(instructionsText);


    let rect = new PIXI.Graphics();

    rect.beginFill(0xFFFFFF);

    // draw a rectangle
    rect.drawRect(750, 50, 500, window.innerHeight);
    app.stage.addChild(rect);
    rect.height = 0; 
    rulesText.on('mouseover', (event) => {
        rulesText.text = rules;
        rulesText.style.backgroundColor = "white";
        rulesText.style.fontSize = "20px";
        rect.height = window.innerHeight;
    });
    app.stage.addChild(rulesText);
    rulesText.on('mouseout', (event) => {
        rulesText.text = "?";
        rulesText.style.fontSize = "40px";
        rect.height = 0;
    });




    investmentTexts = [eduText, healthText, transportText];
   
    investmentTexts.forEach((value, i) =>{
        let index = i;
        value.interactive = true;
        value.on('mousedown', ()=>{
            if(investment.selectedCity == -1 || player.promisesLeft[index] == 0 || investment.isOwn) return;

            if(instructionIndex == 1){
                instructionIndex++;
                updateInstruction();
                blinkReady();
            }

            player.promisesLeft[index]--;
            investment.promise[index]++;
            selectionText.text = `You are investing ${investment.promise[0]} 🎓, ${investment.promise[1]} 🏥, ${investment.promise[2]} 🚋 on ${cities[investment.selectedCity].name}`;
            resetUI();
        })
    })
}

function blinkReady(){

}

function blinkInstruction(){
    return;
    //instructionsText.style.fill = "white";
    let interval = setInterval(()=>{
        if(i++ == 1){
            clearInterval(interval);
        }
        instructionsText.style.fill = (instructionsText.style.fill == "black") ? "white" : "black";
    }, 500)
}

function blinkPromises(){
    console.log("Blinking promise");
    let i = 0;
    let interval = setInterval(()=>{
        if(i++ == 1){
            clearInterval(interval);
        }
        eduText.style.fill = (eduText.style.fill == "black") ? "red" : "black";
        healthText.style.fill = (healthText.style.fill == "black") ? "red" : "black";
        transportText.style.fill = (transportText.style.fill == "black") ? "red" : "black";
    }, 500)
}

function updateInstruction(){
    instructionsText.text = "Instruction: " + instructions[instructionIndex];
    blinkInstruction();
}

function updateVoteText(){
    popText.text = "Total 🗳️: " + player.totalPop + "K";
}

function setButtonActive(isActive){

    hexagons.forEach((hexagon) => {
        hexagon.interactive = isActive;
    });
    button.interactive = isActive;

    button.style.fill = (isActive) ? "black" : "gray";
}

function resetColor(){
    hexagons.forEach((hexagon, i) =>{
        if(!player.occupiedCities.has(i) && cityOwnerShips[i].owner == -1)
        hexagon.changeTextColor("black");
    });
}

function initMapView(data){

    let map = new PIXI.Sprite(PIXI.Texture.from('/map.png'));
    app.stage.addChild(map);
    map.x = 50;
    map.y = 50;

    map.width = map.height = 600;

    let hexagons = [];
    for(let i = 0; i < data.length ; i++){
        let hexagon = new PIXI.Graphics();
        cityOwnerShips.push({owner: -1});
        cities.push(new CityClient(i, data[i].name, data[i].primaryPromise, data[i].population));
        if(i < 8){
            hexagon.x = map.x + 280 + 250 * (Math.cos(Math.PI / 4 * i - Math.PI / 8));
            hexagon.y = map.y + 280 + 250 * (Math.sin(Math.PI / 4 * i - Math.PI / 8));
        } else if(i < 12){
            hexagon.x = map.x + 280 + 135 * (Math.cos(Math.PI / 2 * i - Math.PI / 8));
            hexagon.y = map.y + 280 + 135 * (Math.sin(Math.PI / 2 * i - Math.PI / 8));
        } else {
            hexagon.x = map.x + 280;
            hexagon.y = map.y + 280;
            
        }
        hexagon.interactive = true;
        
        hexagon.basicText = new PIXI.Text(`${cities[i].name}\n${promisesDict[cities[i].primary]}\n${cities[i].population}K 🗳️`, {'font': "16px"});
        hexagon.basicText.x = 0;
        hexagon.basicText.y = 0;

        hexagon.changeText = (text) => (hexagon.basicText.text = text);
        hexagon.changeTextColor = (color) => (hexagon.basicText.style.fill = color);

        hexagon.addChild(hexagon.basicText);
        hexagon.on('mousedown', () => {
            resetColor();



            // Since city is changed, reset the investments
            arrayAssign(player.promisesInitial, player.promisesLeft);
            investment.promise = [0, 0, 0];
            resetUI();
            if(!canGo(i)){
                investment.selectedCity = -1;
                selectionText.text = "You cannot invest on that city!\nTo invest you should acquire at least one of the following cities:\n";
                let preRequisities = getPrerequisities(i);
                let necessaryCities = "";
                preRequisities.forEach((cityId) => {
                    necessaryCities += cities[cityId].name + " ";
                });
                selectionText.text += necessaryCities;
                setActiveColorInvestmentTexts(false);
                return;
            }
            setActiveColorInvestmentTexts(true);
            investment.selectedCity = i;

            if(instructionIndex == 0){
                instructionIndex++;
                updateInstruction();
                blinkPromises();
            }
            
            if(player.occupiedCities.has(i)){
                investment.isOwn = true;
                let promises = player.occupiedCities.get(i);
                selectionText.text = `You had invested ${promises[0]} 🎓, ${promises[1]} 🏥, ${promises[2]} 🚋 on ${cities[i].name}`;
                setActiveColorInvestmentTexts(false);
                button.text = "Give Up City";
            } else {
                investment.isOwn = false;
                if(cityOwnerShips[i].owner == -1){
                    hexagon.changeTextColor("blue");
                }
                selectionText.text = `You are investing ${investment.promise[0]} 🎓, ${investment.promise[1]} 🏥, ${investment.promise[2]} 🚋 on ${cities[i].name}`;
                button.text = "Ready";
            }
        });
        app.stage.addChild(hexagon);
        hexagons.push(hexagon);
    }
    app.stage.addChild(button);
    return hexagons;
}

function canGo(to){
    if(player.occupiedCities.has(to)){
        return true;
    }
    if(to < 8){
        return true;
    }
    else if(to == 8 && (player.occupiedCities.has(0) || player.occupiedCities.has(7) || player.occupiedCities.has(1))){
        return true;
    } else if(to == 9 && (player.occupiedCities.has(1) || player.occupiedCities.has(2) || player.occupiedCities.has(3))){
        return true;
    } else if(to == 10 && (player.occupiedCities.has(3) || player.occupiedCities.has(4) || player.occupiedCities.has(5))){
        return true;
    } else if(to == 11 && (player.occupiedCities.has(5) || player.occupiedCities.has(6) || player.occupiedCities.has(7))){
        return true;
    } else if(to == 12 && (player.occupiedCities.has(8) || player.occupiedCities.has(9) 
        || player.occupiedCities.has(10) || player.occupiedCities.has(11))){

        return true;
    }

    return false;
}

function getPrerequisities(to){
    let result = [];
    if(to == 8){
        result.push(0);
        result.push(7);
        result.push(1);
    } else if(to == 9){
        result.push(1);
        result.push(2);
        result.push(3);
    } else if(to == 10){
        result.push(3);
        result.push(4);
        result.push(5);
    } else if(to == 11){
        result.push(5);
        result.push(6);
        result.push(7);
    } else if(to == 12){
        result.push(8);
        result.push(9);
        result.push(10);
        result.push(11);
    }
    return result;
}

function resetUI(){
    eduText.text = "🎓 Promises Left: " + player.promisesLeft[0];
    healthText.text = "🏥 Promises Left: " + player.promisesLeft[1];
    transportText.text = "🚋 Promises Left: " + player.promisesLeft[2];   
}


socket.emit('new user', {name: player.name, surname: player.surname});

let hexagons;


socket.on('new turn', () => {
    setButtonActive(true);
});

socket.on('welcome', (data) => {
    player.id = data.size;
    playerText.text = "You are Player # " + player.id;
    investment.id = data.size;
    hexagons = initMapView(data.cities);
    initUI();
    boldAcquirable();
});

socket.on("game over", (text) => {
    eduText.text = "";
    healthText.text = "";
    transportText.text = "";
    selectionText.text = text;
});

socket.on('results ready', (outcome) => {
    gameStatText.text = "Turn Results:\n";
    let capturedCity = -1;
    console.log(outcome);
    selectionText.text = "You did not select any city!";
    resetColor();
    turnText.text = "Turn # " + outcome.turnNo;
    cityOwnerShips = outcome.cityOwnerShips;
    let lostCities = outcome.lostCities;

    // Change the texts
    hexagons.forEach((hexagon, i) => {
        if(cityOwnerShips[i].owner != -1){
            hexagon.changeText(`${cities[i].name}\n${promisesDict[cities[i].primary]}\n${cities[i].population}K 🗳️\nWon by ${cityOwnerShips[i].score} points`);
        }
        else
            hexagon.changeText(`${cities[i].name}\n${promisesDict[cities[i].primary]}\n${cities[i].population}K 🗳️`);
        if(capturedCity == -1 && cityOwnerShips[i].owner == player.id && !player.occupiedCities.has(i) ){
            capturedCity = i;
        }
    });


    setButtonActive(true);
    console.log(capturedCity);
    console.log(player.occupiedCities.has(capturedCity));
    if(capturedCity != -1){ // If it is newly acquired.

        let investedPromises = diffArray(player.promisesInitial, player.promisesLeft);
        player.occupiedCities.set(capturedCity, investedPromises);
        arrayAssign(player.promisesLeft, player.promisesInitial);
        gameStatText.text  += "You acquired " + cities[capturedCity].name + "\n";
        hexagons[capturedCity].changeTextColor("green");
        player.totalPop += cities[capturedCity].population;
    } else if(capturedCity == -1){
        arrayAssign(player.promisesInitial, player.promisesLeft);
        gameStatText.text  += "You could not win any city in this turn\n";
    }

    // TODO: Bring cities as well
    if(lostCities[player.id].lost){
        let returnedPromises = lostCities[player.id].returnedPromises;
        player.promisesInitial[0] += returnedPromises[0];
        player.promisesInitial[1] += returnedPromises[1];
        player.promisesInitial[2] += returnedPromises[2];
        arrayAssign(player.promisesInitial, player.promisesLeft);

        // Deoccupy the lost cities
        lostCities[player.id].cities.forEach((city)=>{
            player.occupiedCities.delete(city.cityId);
            gameStatText.text  += "You lost " + cities[city.cityId].name + "\n";

            //If it is newly invested do not decrement the population since it is never added
            if(!city.newlyInvested)
                player.totalPop -= cities[city.cityId].population;
        });
    }
    // Change the colors
    hexagons.forEach((hexagon, i) => {
        if(cityOwnerShips[i].owner != -1){
            if(!player.occupiedCities.has(i)){
                hexagon.changeTextColor("red");
            }
        }
        else
            hexagon.changeTextColor("black");
    });

    console.log(player);
    updateVoteText();
    resetUI();

    if(outcome.turnNo == 10){
        socket.emit('inform population', {id: player.id, totalPop: player.totalPop});
    }
    
    boldAcquirable();
})

function arrayAssign(from, to){
    if(from.length != to.length){
        throw("Sizes do not match");
    }

    from.forEach((_, i)=>{
        to[i] = from[i];
    })
}

function diffArray(x, y){
    if(x.length != y.length){
        throw("Sizes do not match");
    }
    let result = [];
    x.forEach((_, i)=>{
        result.push(x[i] - y[i]);
    })
    return result;
}

function setActiveColorInvestmentTexts(isActive){
    investmentTexts.forEach((text) => {
        text.style.fill = (isActive) ? "black" : "gray";
    });
}


function boldAcquirable(){
    hexagons.forEach((hexagon, i) => {
        if(canGo(i)){
            hexagon.basicText.style.fontStyle = "bold";
        } else {
            hexagon.basicText.style.fontStyle = "normal";    
        }
    });
}