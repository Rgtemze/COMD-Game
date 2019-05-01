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
        this.occupiedCities = new Set();
    }

}
class Investment{
    constructor(){
        this.id = -1;
        this.promise = [0,0,0];
        this.selectedCity = -1;
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
        socket.emit('investment', investment);
        console.log(investment);
        console.log(player);
        investment.selectedCity = -1;
        selectionText.text = "You did not select any city!";
        investment.promise = [0, 0, 0];
        
        setButtonActive(false);
    });

    eduText.x = 600;
    eduText.y = 150;
    app.stage.addChild(eduText);

    healthText.x = 600;
    healthText.y = 200;
    app.stage.addChild(healthText);

    transportText.x = 600;
    transportText.y = 250;
    app.stage.addChild(transportText);

    selectionText.x = 600;
    selectionText.y = 50;
    app.stage.addChild(selectionText);

    let texts = [eduText, healthText, transportText];
   
    texts.forEach((value, i) =>{
        let index = i;
        value.interactive = true;
        value.on('mousedown', ()=>{
            if(investment.selectedCity == -1 || player.promisesLeft[index] == 0) return;
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
        /*
        hexagon.beginFill(0xFF0000);
        hexagon.drawPolygon([
            -hexagonRadius, 0,
            -hexagonRadius/2, hexagonHeight/2,
            hexagonRadius/2, hexagonHeight/2,
            hexagonRadius, 0,
            hexagonRadius/2, -hexagonHeight/2,
            -hexagonRadius/2, -hexagonHeight/2,
        ])
        
        hexagon.endFill();
        */
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

        //hexagon.primary = new 


        hexagon.changeText = (text) => (hexagon.basicText.text = text);

        hexagon.addChild(hexagon.basicText);
        hexagon.on('mousedown', () => {
            investment.selectedCity = i;
            selectionText.text = "You selected City" + i + " whose primary promise is "+ cities[i].primary;

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

function canGo(from, to){

    if(to == 8 && (from == 0 || from == 7 || from == 1)){
        return true;
    } else if(to == 9 && (from == 1 || from == 2 || from == 3)){
        return true;
    } else if(to == 10 && (from == 3 || from == 4 || from == 5)){
        return true;
    } else if(to == 11 && (from == 5 || from == 6 || from == 7)){
        return true;
    }

    return false;

}

function resetUI(){
    eduText.text = "Education Promises Left: " + player.promisesLeft[0];
    healthText.text = "Health Promises Left: " + player.promisesLeft[1];
    transportText.text = "Transportation Promises Left: " + player.promisesLeft[2];   
}

function arrayAssign(from, to){
    if(from.length != to.length){
        throw("Sizes do not match");
    }

    from.forEach((_, i)=>{
        to[i] = from[i];
    })
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

socket.on('results ready', (cityOwnerships) => {
    let capturedCity = -1;
    hexagons.forEach((hexagon, i) => {
        hexagon.basicText.text = "User # " + cityOwnerships[i];
        if(capturedCity == -1 && cityOwnerships[i] == player.id){
            capturedCity = i;
        }
    });
    setButtonActive(true);
    //console.log(result);
    if(capturedCity != -1){
        arrayAssign(player.promisesLeft, player.promisesInitial);
        player.occupiedCities.add(capturedCity);
        console.log("I won the City # " + capturedCity + " in this turn");
    } else {
        arrayAssign(player.promisesInitial, player.promisesLeft);
        console.log("I could not win any city in this turn");
        resetUI();
    }
})