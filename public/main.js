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
    }

}
class Investment{
    constructor(){
        this.id = -1;
        this.promise = [0,0,0];
        this.selectedCity = -1;
        this.isOwn = false;
    }
}

class CityClient{
    constructor(id, primary){
        this.id = id;
        this.primary = primary;
    }
}


let investment = new Investment();
let button = new PIXI.Text("Ready");
let player = new Player("Ziya", "Erkoc");
let eduText = new PIXI.Text("Education Promises Left: " + player.promisesLeft[0]);
let healthText = new PIXI.Text("Health Promises Left: " + player.promisesLeft[1]);
let transportText = new PIXI.Text("Transportation Promises Left: " + player.promisesLeft[2]);
let selectionText = new PIXI.Text("You did not select any city!");

let cities = [];
function initUI(){
    button.interactive = true;
    button.on('mousedown', () => {

        console.log(investment);
        console.log(player);
        if(investment.selectedCity == -1){
            return;
        }
        socket.emit('investment', investment);
        investment.selectedCity = -1;
        selectionText.text = "You did not select any city!";
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

    let texts = [eduText, healthText, transportText];
   
    texts.forEach((value, i) =>{
        let index = i;
        value.interactive = true;
        value.on('mousedown', ()=>{
            if(investment.selectedCity == -1 || player.promisesLeft[index] == 0 || investment.isOwn) return;
            player.promisesLeft[index]--;
            investment.promise[index]++;
            resetUI();
        })
    })
}

function setButtonActive(isActive){

    hexagons.forEach((hexagon) => {
        hexagon.interactive = isActive;
    });

    if(isActive){
        button.interactive = true;
        button.style.fill = "black";
        
    } else {

        button.interactive = false;
        button.style.fill = "gray";
    }
}

function initMapView(numberOfCities, cityPrimaries){

    let map = new PIXI.Sprite(PIXI.Texture.from('/map.png'));
    app.stage.addChild(map);
    map.x = 100;
    map.y = 100;

    let hexagons = [];
    for(let i = 0; i < numberOfCities ; i++){
        let hexagon = new PIXI.Graphics();
        cities.push(new CityClient(i, cityPrimaries[i]));
        if(i < 8){
            hexagon.x = map.x + 240 + 220 * (Math.cos(Math.PI / 4 * i - Math.PI / 8));
            hexagon.y = map.y + 240 + 220 * (Math.sin(Math.PI / 4 * i - Math.PI / 8));
        } else if(i < 12){
            hexagon.x = map.x + 240 + 130 * (Math.cos(Math.PI / 2 * i));
            hexagon.y = map.y + 240 + 130 * (Math.sin(Math.PI / 2 * i));
        } else {
            hexagon.x = map.x + 240;
            hexagon.y = map.y + 240;
            
        }
        hexagon.interactive = true;
        
        hexagon.basicText = new PIXI.Text(i, {'font': "20px"});
        hexagon.basicText.x = 0;
        hexagon.basicText.y = 0;

        hexagon.changeText = (text) => (hexagon.basicText.text = text);

        hexagon.addChild(hexagon.basicText);
        hexagon.on('mousedown', () => {
            

            if(!canGo(i)){
                investment.selectedCity = -1;
                selectionText.text = "You cannot select that city!";
                return;
            }
            investment.selectedCity = i;
            if(player.occupiedCities.has(i)){
                investment.isOwn = true;
                let promises = player.occupiedCities.get(i);
                selectionText.text = `Your own city with promises [${promises[0]}, ${promises[1]}, ${promises[2]}]`;

            } else {
                investment.isOwn = false;
                selectionText.text = `You selected City ${i} whose primary promise is ${cities[i].primary}`;
            }

            // Since city is changed, reset the investments
            arrayAssign(player.promisesInitial, player.promisesLeft);
            investment.promise = [0, 0, 0];
            resetUI();
        });
        app.stage.addChild(hexagon);
        hexagons.push(hexagon);
    }
    app.stage.addChild(button);
    return hexagons;
}

function canGo(to){
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

function resetUI(){
    eduText.text = "Education Promises Left: " + player.promisesLeft[0];
    healthText.text = "Health Promises Left: " + player.promisesLeft[1];
    transportText.text = "Transportation Promises Left: " + player.promisesLeft[2];   
}


socket.emit('new user', {name: player.name, surname: player.surname});

let hexagons;


socket.on('new turn', () => {
    setButtonActive(true);
});

socket.on('welcome', (data) => {
    player.id = data.size;
    investment.id = data.size;
    hexagons = initMapView(data.numberOfCities, data.cityPrimaries);
    initUI();

});

socket.on('results ready', (outcome) => {
    let capturedCity = -1;
    console.log(outcome);
    let cityOwnerShips = outcome.cityOwnerShips;
    let lostCities = outcome.lostCities;
    hexagons.forEach((hexagon, i) => {
        if(cityOwnerShips[i].owner != -1)
            hexagon.changeText("Owner: #" + cityOwnerShips[i].owner + "\n Score: " + cityOwnerShips[i].score);
        else
            hexagon.changeText("Emp");
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
        console.log("I won the City # " + capturedCity + " in this turn");
    } else if(capturedCity == -1){
        arrayAssign(player.promisesInitial, player.promisesLeft);
        console.log("I could not win any city in this turn");
    }

    // TODO: Bring cities as well
    if(lostCities[player.id].lost){
        let returnedPromises = lostCities[player.id].returnedPromises;
        player.promisesInitial[0] += returnedPromises[0];
        player.promisesInitial[1] += returnedPromises[1];
        player.promisesInitial[2] += returnedPromises[2];
        arrayAssign(player.promisesInitial, player.promisesLeft);

        // Deoccupy the lost citie
        lostCities[player.id].cities.forEach((city)=>{
            player.occupiedCities.delete(city);
            console.log("I lost City # " + city);
        });
    }
    console.log(player);
    resetUI();
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