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
        this.totalPlayerCount = 2;
        this.playersAwaited = this.totalPlayerCount;
        this.cities = [];
        this.players = [];
        this.numberOfCities = 13;
        this.cityOwnerShips = [];
        for(let i = 0; i < this.numberOfCities; i++){
            let city = new City("Adana" + i);
            this.cities.push(city);
            this.cityOwnerShips.push(-1);
        }
        this.playerNo = 0;
    }
    
    addUser(player){
        this.playerNo++;
        this.players.push(player);
    }

    nextTurn(outcome){
        this.playersAwaited = this.totalPlayerCount;
        this.isReady = true;
        console.log(this.players);
        io.sockets.emit("results ready", outcome);
    }

    processInvestment(investment){
        this.playersAwaited--;
        this.players[investment.id].promises = investment.promise;
        this.players[investment.id].selectedCity = investment.selectedCity;

        if(this.playersAwaited == 0){
            this.processTurn();
        }
    }

    
    calculateScore(promises, primaryPromise){
        let sum = 0;
        promises.forEach((promise, i) => {
            if(primaryPromise == i){
                sum += 2 * promise;
            } else {
                sum += promise;
            }
        });
        return sum;
    }


    // Calculate whom wins or losts what.
    processTurn(){
        
        console.log("\nNew Turn\n");

        let results = []; // This must be as much as number of cities
        for(let i = 0; i < this.numberOfCities; i++){
            results.push([]);
        }

        this.players.forEach(player => {
            let city = player.selectedCity;
            let sum = this.calculateScore(player.promises, this.cities[city].primaryPromise);
            results[city].push({id: player.id, sum: sum});
            console.log("Player: " + player.id + " had score " + sum + " in the City # " + city);
        });

        let lostCities = []; // As much as the number of players
        for(let i = 0; i < this.totalPlayerCount; i++){
            lostCities.push({lost: false, returnedPromises: [0, 0, 0], cities: []});
        }

        results.forEach((result, city) => {
            let max = 0;
            let ownerId = -1;

            result.forEach(entry =>{
                if(entry.sum > max){
                    max = entry.sum;
                    ownerId = entry.id;
                }
            });

            // Check if there are more than one maxs.
            result.forEach(entry =>{
                if(entry.sum == max && ownerId != entry.id){
                    ownerId = -1;
                    console.log("Two maxs");
                    return;
                }
            });
            
            // If there is a winner, it is guaranteed that s/he is unique.
            if(ownerId != -1){

                let cityObj = this.cities[city];
                let cityScore = this.calculateScore(cityObj.promises, cityObj.primaryPromise);
                let oldOwner;
                if(max > cityScore){
                    oldOwner = cityObj.owner;

                    // If it had an owner
                    if(oldOwner != -1){
                        lostCities[oldOwner].lost = true;
                        lostCities[oldOwner].cities.push(city);
                        //arrayAssign(cityObj.promises, lostCities[oldOwner].returnedPromises);
                        this.addSumToFirstArray( lostCities[oldOwner].returnedPromises, cityObj.promises);
                        console.log("Returned promises");
                        console.log(lostCities[oldOwner].returnedPromises);
                        console.log("City promises");
                        console.log(cityObj.promises);
                    }
                    arrayAssign(this.players[ownerId].promises, cityObj.promises);
                    cityObj.owner = ownerId;
                } else {
                    ownerId = -1;
                }

            }

            console.log("City # " + city + " goes to " + ownerId);

            if(ownerId != -1){
                this.cityOwnerShips[city] = ownerId;
            }
        });

        let outcome = {cityOwnerShips: this.cityOwnerShips, lostCities: lostCities}

        this.nextTurn(outcome);

    }

    addSumToFirstArray(from, to){
        if(from.length != to.length){
            throw("Sizes do not match!");
        }

        for(let i = 0; i < from.length; i++){
            from[i] += to[i];
        }
    }

}
class City{
    constructor(name){
        this.name = name;
        this.promises = [0, 0, 0];
        this.primaryPromise = Math.floor(Math.random() * 3);
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
function arrayAssign(from, to){
    if(from.length != to.length){
        throw("Sizes do not match");
    }

    from.forEach((_, i)=>{
        to[i] = from[i];
    })
}
gc = new GameController();
