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

        if(gc.playerNo == gc.totalPlayerCount){
            socket.emit("server full");
            return;
        }
        console.log(gc.playerNo);

        let primaries = [];
        let populations = [];
        gc.cities.forEach((city) => {
            primaries.push(city.primaryPromise);
            populations.push(city.population);
        });

        console.log("User Connected: " + gc.playerNo);
        socket.emit("welcome", {size: gc.playerNo, cities: gc.cities});
        gc.addUser(player);
    }));

    socket.on('investment', data => {
        
        gc.processInvestment(data);
        
    });

    socket.on('reset', () => {
        gc = new GameController();
        io.sockets.emit("refresh");
    });

    socket.on('inform population', data => {
        
        gc.players[data.id].totalPop = data.totalPop;
        
        gc.popInfoRemaining--;

        if(gc.popInfoRemaining == 0){
            gc.finish();
        }
    });
});

http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});

class GameController{
    constructor(){
        this.isReady = true;
        this.totalPlayerCount = 2;
        this.playersAwaited = this.totalPlayerCount;
        this.popInfoRemaining = this.totalPlayerCount;
        this.cities = [];
        this.players = [];
        this.numberOfCities = 13;
        this.cityOwnerShips = [];
        this.turnNo = 1;
        this.cityNames = ["Van", "Muş", "Antep", "Urfa", "Konya", "Uşak", "Bolu", "Rize", "Adana", "Mersin", "İzmir", "Bursa", "Ankara"]
        for(let i = 0; i < this.numberOfCities; i++){
            let cityObj = new City(this.cityNames[i], i);
            this.cities.push(cityObj);
            this.cityOwnerShips.push({owner: -1, score: 0});
        }
        this.playerNo = 0;
    }
    
    finish(){
        console.log(this.players);
        let max = 0;
        let id = -1;
        let same = false;
        this.players.forEach((player,i) => {
            let pop = player.totalPop;
            if(pop >= max){
                same = (pop == max);
                max = pop;
                id = i;
            }
            console.log("Same: " + same + "Pop: " + pop + "Max: " + max);
        });

        if(!same)
            io.sockets.emit("game over","Player # " + id + " won with " + max + " votes");
        else
            io.sockets.emit("game over", "Nobody won" + max);  
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
        this.players[investment.id].isOwn = investment.isOwn;
        this.players[investment.id].totalPop = investment.totalPop;

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

        // Check player's scores for each city.
        this.players.forEach(player => {
            let city = player.selectedCity;
            console.log(city);
            console.log(this.cities[city]);
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
            let cityObj = this.cities[city];

            // If there is a winner, it is guaranteed that s/he is unique.
            if(ownerId != -1){

                let cityScore = cityObj.score;//this.calculateScore(cityObj.promises, cityObj.primaryPromise);
                let oldOwner;
                if(max > cityScore){
                    console.log("Better score! " + max + " > " + cityScore);
                    oldOwner = cityObj.owner;

                    // If it had an owner previously
                    if(oldOwner != -1){
                        lostCities[oldOwner].lost = true;
                        lostCities[oldOwner].cities.push({cityId: city, newlyInvested: false});
                        this.addSumToFirstArray( lostCities[oldOwner].returnedPromises, cityObj.promises);
                        console.log("Returned promises");
                        console.log(lostCities[oldOwner].returnedPromises);
                        console.log("City promises");
                        console.log(cityObj.promises);
                    }
                    arrayAssign(this.players[ownerId].promises, cityObj.promises);
                    cityObj.score = max;
                    cityObj.owner = ownerId;

                    this.cityOwnerShips[city].owner = ownerId;
                    this.cityOwnerShips[city].score = max;
                } else {
                    ownerId = -1;
                }
            }

            console.log("City # " + city + "newly goes to " + ownerId);

        });


        // Check if there are cities given up.
        this.players.forEach(player => {
            let city = player.selectedCity;
            if(!player.isOwn || this.cityOwnerShips[city].owner != player.id) return;
            lostCities[player.id].lost = true;
            lostCities[player.id].cities.push({cityId: city, newlyInvested: false});
            this.addSumToFirstArray(lostCities[player.id].returnedPromises, this.cities[city].promises);
            this.cityOwnerShips[city].owner = -1; 
            this.cityOwnerShips[city].score = 0; 
            
            let cityObj = this.cities[city];

            cityObj.score = 0;
            cityObj.owner = -1;
            cityObj.resetPromises();
        });
        
        // Check if the player has lost any prerequisite city, if so, s/he may lost other cities.

        lostCities.forEach((lostInfo, id) => {
            if(lostInfo.lost){ // If user lost any city that is problem.
                
                // Loop through all the cities lost
                lostInfo.cities.forEach(city =>{
                    let cityId = city.cityId;
                    console.log("Checking " + cityId + "for further lost cities")
                    if(cityId == 12){
                        return;
                    }
                    let cityObj = this.cities[cityId];
                    let rightCityObj = this.cities[cityObj.getRightNeighbour()];
                    let rightRightCityObj = this.cities[this.cities[cityObj.getRightNeighbour()].getRightNeighbour()];
                    let leftCityObj = this.cities[cityObj.getLeftNeighbour()];
                    let leftLeftCityObj = this.cities[this.cities[cityObj.getLeftNeighbour()].getLeftNeighbour()];
                    let innerNeighbours = cityObj.getInnerNeighbours();
                    if(innerNeighbours.length == 1){

                        this.loseCity(innerNeighbours[0], id, leftCityObj, rightCityObj, null, lostCities);

                    } else if(innerNeighbours.length == 2) {

                        // cityId is a edge case because for this city the id of right city is bigger than the id of the left city
                        // Since innerNeighbours returns smaller id first, it used to create problem.
                        if(cityId == 7){
                            this.loseCity(innerNeighbours[1], id, null, rightCityObj, rightRightCityObj,  lostCities);
                            this.loseCity(innerNeighbours[0], id, leftCityObj, null, leftLeftCityObj, lostCities);
                        } else {
                            this.loseCity(innerNeighbours[0], id, null, rightCityObj, rightRightCityObj, lostCities);
                            this.loseCity(innerNeighbours[1], id, leftCityObj, null, leftLeftCityObj, lostCities);
                        }
                    }
                    //If the outermost city is lost, then capital might be lost as well.
                    this.loseCapital(id, lostCities);
                });

            }
        });
        this.cityOwnerShips.forEach((cityOwnerShip) => {
            console.log("Ownership: " + cityOwnerShip.owner + ", " + cityOwnerShip.score);
        })
        gc.turnNo++;
        let outcome = {cityOwnerShips: this.cityOwnerShips, lostCities: lostCities, turnNo: gc.turnNo}

        this.nextTurn(outcome);
    }

    // This method is for losing cities after losing a city
    loseCity(gidiciId, playerId, leftCityObj, rightCityObj, furtherObj, lostCities){

        let leftResult = (leftCityObj != null) ? (leftCityObj.owner != playerId) : true;
        let rightResult = (rightCityObj != null) ? (rightCityObj.owner != playerId) : true;
        let furtherResult = (furtherObj != null) ? (furtherObj.owner != playerId) : true;
        console.log("Left Result: " + leftResult);
        console.log("Left Obj: " + leftCityObj);
        console.log("Right Result: " + rightResult);
        console.log("Right Obj: " + rightCityObj);
        console.log("Gidici: " + gidiciId);
        console.log("player: " + playerId);
        if (this.cityOwnerShips[gidiciId].owner == playerId
            && leftResult && rightResult && furtherResult){
            let gidiciCityObj = this.cities[gidiciId];
            lostCities[playerId].lost = true;
            
            // If it is the currently invested city do not return the promises.
            if(this.players[playerId].selectedCity != gidiciId){
                lostCities[playerId].cities.push({cityId: gidiciId, newlyInvested: false});
                this.addSumToFirstArray(lostCities[playerId].returnedPromises, gidiciCityObj.promises);
            } else {
                lostCities[playerId].cities.push({cityId: gidiciId, newlyInvested: true});
            }
            this.cityOwnerShips[gidiciId].owner = -1; 
            this.cityOwnerShips[gidiciId].score = 0; 

            gidiciCityObj.score = 0;
            gidiciCityObj.owner = -1;
            gidiciCityObj.resetPromises();

            

        }
    }
    loseCapital(playerId, lostCities){
        let gidiciCityObj = this.cities[12];
        if(this.cityOwnerShips[12].owner == playerId 
            && this.cityOwnerShips[11].owner != playerId
            && this.cityOwnerShips[10].owner != playerId
            && this.cityOwnerShips[9].owner != playerId
            && this.cityOwnerShips[8].owner != playerId){
                
            this.cityOwnerShips[12].owner = -1; 
            this.cityOwnerShips[12].score = 0; 
            lostCities[playerId].lost = true;
                
            // If it is the currently invested city do not return the promises.
            if(this.players[playerId].selectedCity != 12){
                lostCities[playerId].cities.push({cityId: 12, newlyInvested: false});
                this.addSumToFirstArray(lostCities[playerId].returnedPromises, gidiciCityObj.promises);
            } else {
                lostCities[playerId].cities.push({cityId: 12, newlyInvested: true});
            }

            gidiciCityObj.score = 0;
            gidiciCityObj.owner = -1;
            gidiciCityObj.resetPromises();
        }
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
const populations = [30, 10, 20, 10, 40, 10, 20, 10, 50, 45, 40, 45, 60];
class City{


    constructor(name, id){
        this.id = id;
        this.name = name;
        this.promises = [0, 0, 0];
        this.primaryPromise = Math.floor(Math.random() * 3);
        this.score = 0;
        this.population = populations[id];
        this.owner = -1;
        this.dict = {};
    }

    getName(){
        return this.name;
    }

    resetPromises(){
        this.promises[0] = 0;
        this.promises[1] = 0;
        this.promises[2] = 0;
    }

    getLeftNeighbour(){
        
        if(this.id < 8){
            return (this.id + 1) % 8;
        } else if(this.id < 12){
            return (this.id == 11) ? 8: (this.id + 1);
        }
        return -1; // Number of outer cities
    }

    getRightNeighbour(){
        if(this.id < 8){
            return (this.id == 0) ? 7 : (this.id - 1);
        } else if(this.id < 12){
            return (this.id == 8) ? 11 : (this.id - 1);
        }
        return  -1; // Number of outer cities
    }

    getInnerNeighbours(){
        let result = [];

        if(this.id == 0 || this.id == 7 || this.id == 1){
            result.push(8);
        }
        if(this.id == 1 || this.id == 2 || this.id == 3){
            result.push(9);
        }
        if(this.id == 3 || this.id == 4 || this.id == 5){
            result.push(10);
        }
        if(this.id == 5 || this.id == 6 || this.id == 7){
            result.push(11);
        }
        if(this.id == 8 || this.id == 9 || this.id == 10 || this.id == 11){
            result.push(12);
        }
        return result;
    }

    setPopulation(population){
        this.population = population;
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
        this.isOwn = false;
        this.totalPop = 0;
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
