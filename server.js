const express = require("express");
const app = express();
const session = require("express-session");
const path = require("path");

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: 'something',
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 60000}
}))

app.use(express.static(path.join(__dirname, "./static")));
app.set('views', path.join(__dirname, './views')); 
app.set('view engine', 'ejs');

const server = app.listen(1337);
const io = require('socket.io')(server);
var counter = 0;
var players ={};
var users = {};
class Boss{
    constructor(){
        this.health = 10000;
    }
}
var BigBoss = new Boss();
class Player{
    constructor(name){
        this.name = name;
        this.health = 100;
    }

    attack(Boss){
        Boss.health -= 10;
        this.health -= 4;
    }

    heal(Attacker){
        if(Attacker){
            Attacker.health += 6;
            if(Attacker.health > 100){
                Attacker.health = 100;
            }            
        }
        this.health -= 3;
    }
}

app.get('/', function(req, res){
    res.render('index');
})

io.on('connection', function (socket){
    socket.emit('display_existing_users', {players: players, boss: BigBoss});
    socket.emit('greeting', {msg: 'Greetings, from server node, brought to you by Sockets! - Server'});
    socket.on('thankyou', function (data){
        console.log(data.msg);
    });
    socket.on('create_new_user', function(data){
        console.log("you have created a new user!");
        if(data.status == 'player'){
            var newPlayer = new Player(data.name);
            users[socket.id] = newPlayer;
            players[socket.id] = newPlayer;
        }
        else{
            users[socket.id] = {name: data.name, status: data.status} ;
        }
        io.emit('display_new_user', {players: players, userId: socket.id});
        console.log(players);
        console.log(data.name);
    })

    socket.on('user_attack_boss', function(data){
        var user = players[socket.id];
        if(user){
            if(BigBoss.health > 0){
                user.attack(BigBoss);
                io.emit('update_health', {players: players, boss: BigBoss});
                
                if(user.health <= 0){
                    delete players[socket.id];
                    io.emit('disconnect_user', {userId: socket.id});                        
                }                  
            } 
        }
    })

    socket.on('heal_user', function(data){
        var currUser = players[socket.id]; 
        if(currUser){
            if(socket.id != data.user_heal){
                var user = players[data.user_heal];
                currUser.heal(user);
                io.emit('update_health', {players: players, boss: BigBoss});
            }
            if(currUser.health <= 0){
                delete players[socket.id];
                io.emit('disconnect_user', {userId: socket.id});                        
            } 
            
        }
    })

    socket.on('disconnect', function(){
        delete players[socket.id];
        io.emit('disconnect_user', {userId: socket.id});
        console.log(users);
    })
});
