var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});
io.on('connection', function(socket){

    socket.on('new user', (data => {
        let player = new PlayerData(data.name, data.surname, gc.playerNo);

        let primaries = [];
        gc.cities.forEach((city) => {
            primaries.push(city.primaryPromise);
        });

        socket.emit("welcome", {size: gc.playerNo, numberOfCities: gc.numberOfCities, cityPrimaries: primaries});
        gc.addUser(player);
    }));

    socket.on('investment', data => {
        
        gc.processInvestment(data);
        
    });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

class GameController{
    constructor(){
        this.isReady = true;
        this.playersAwaited = 3;
        this.cities = [];
        this.players = [];
        this.numberOfCities = 13;
        for(let i = 0; i < this.numberOfCities; i++){
            let city = new City("Adana" + i);
            this.cities.push(city);
        }
        this.playerNo = 0;
    }
    
    addUser(player){
        this.playerNo++;
        this.players.push(player);
    }

    nextTurn(cityOwnerShips){
        this.playersAwaited = 3;
        this.isReady = true;
        console.log(this.players);
        io.sockets.emit("results ready", cityOwnerShips);
    }

    processInvestment(investment){
        this.playersAwaited--;
        this.players[investment.id].promises = investment.promise;
        this.players[investment.id].selectedCity = investment.selectedCity;

        if(this.playersAwaited == 0){
            this.processTurn();
        }
    }

    processTurn(){
        
        console.log("Turn calculated");

        let results = []; // This must be as much as number of cities
        for(let i = 0; i < this.numberOfCities; i++){
            results.push([]);
        }

        this.players.forEach(player => {

            let sum = 0;
            let city = player.selectedCity;
            player.promises.forEach((promise, i) => {
                if(this.cities[city].primaryPromise == i){
                    sum += 2 * promise;
                } else {
                    sum += promise;
                }
            });
            results[city].push({id: player.id, sum: sum});
            console.log("Player: " + player.id + " had score " + sum + " in the City # " + city);
        });

        let cityOwnerShips = [];
        results.forEach((result, city) => {
            let max = 0;
            let ownerId = -1;
            result.forEach(entry =>{
                if(entry.sum > max){
                    max = entry.sum;
                    ownerId = entry.id;
                }
            });

            console.log("City # " + city + " goes to " + ownerId);
            cityOwnerShips.push(ownerId);
        });


        this.nextTurn(cityOwnerShips);

    }

}
class City{
    constructor(name){
        this.name = name;
        this.promises = [0, 0, 0];
        this.primaryPromise = Math.floor(Math.random() * 4);
        this.owner = -1;
    }

    getName(){
        return this.name;
    }

    setPromise(promise, amount){

        return this.promises[promise] += amount;
    }
}

class PlayerData{
    constructor(name, surname, id){
        this.id = id;
        this.name = name;
        this.surname = surname;
        this.promises = [0, 0, 0];
        this.selectedCity = -1;
    }

}

gc = new GameController();
