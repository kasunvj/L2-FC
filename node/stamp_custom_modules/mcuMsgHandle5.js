/*
This module read and strip data from a given 20byte fix serial data buffer
*/

const {crc16} = require('easy-crc');
var conv = require('hex2dec');
//var myheartbeat = require('./heartbeat'); 

/*MCU communication variables*/

var dataBufIn = Buffer.alloc(15);
var checksmIn = Buffer.alloc(2);
var totalBufOut = Buffer.alloc(20);
var selectContBufOut = Buffer.alloc(1);
var stateCommand = Buffer.alloc(1);
var stopCharge = Buffer.alloc(1);
var errorCommand = Buffer.alloc(1);
var dataBufOut = Buffer.alloc(14);
var checksmOut = Buffer.alloc(2);


//Data from MCU - mode 1
class DataMcuM0 {
	constructor(volt,curr,powr){
		this.volt = volt;
		this.curr = curr;
		this.powr = powr;
    }
	getData(){
		return [this.volt,this.curr,this.powr,'0'];
		}  
};

//Data from MCU - mode 2
class  DataMcuM1{
	constructor(kwh,t1,t2,t3){
		this.kwh = kwh;
		this.t1 = t1;
		this.t2 = t2;
		this.t3 = t3;
		}
		getData(){
			return [this.kwh,this.t1,this.t2,this.t3];
			}
};

class StateMcu{
	constructor(state,activityState,netRequest,powerError,generalError){
		this.state = state
		this.activityState = activityState
		this.netRequest = netRequest
		this.powerError = powerError
		this.generalError = generalError
	}
	getState(){
		return this.state
	}
	getActivityState(){
		return this.activityState
	}
	getNetRequet(){
		return this.netRequest
	}
	getpowerError(){
		return this.powerError
	}
	getGeneralError(){
		return this.generalError
	}
	
}

class L2Charger{
	constructor(volt,curr,powr,kwh,t1,t2,t3,state,activityState,netRequest,powerError,generalError,soc){
		this.volt = volt;
		this.curr = curr;
		this.powr = powr;
		this.kwh = kwh;
		this.t1 = t1;
		this.t2 = t2;
		this.t3 = t3;
		this.state = state
		this.activityState = activityState
		this.netRequest = netRequest
		this.powerError = powerError
		this.generalError = generalError
		this.soc = soc
	}
	
	getData(){
		return [this.volt,this.curr,this.powr,this.kwh,this.t1,this.t2,this.t3];
	}
		
	getState(){
		return this.state
	}
	getActivityState(){
		return this.activityState
	}
	getNetRequet(){
		return this.netRequest
	}
	getpowerError(){
		return this.powerError
	}
	getGeneralError(){
		return this.generalError
	}
	getSoc(){
		return this.soc
	}
}

class FCharger{
	constructor(volt,curr,powr,kwh,t1,t2,t3,state,activityState,netRequest,powerError,generalError,soc){
		this.volt = volt;
		this.curr = curr;
		this.powr = powr;
		this.kwh = kwh;
		this.t1 = t1;
		this.t2 = t2;
		this.t3 = t3;
		this.state = state
		this.activityState = activityState
		this.netRequest = netRequest
		this.powerError = powerError
		this.generalError = generalError
		this.soc = soc
	}
	
	getData(){
		return [this.volt,this.curr,this.powr,this.kwh,this.t1,this.t2,this.t3];
	}
	getState(){
		return this.state
	}
	getActivityState(){
		return this.activityState
	}
	getNetRequet(){
		return this.netRequest
	}
	getpowerError(){
		return this.powerError
	}
	getGeneralError(){
		return this.generalError
	}
	getSoc(){
		return this.soc
	}
}


var mcuDataM0 = new DataMcuM0(0.0,0.0,0.0);
var mcuDataM1 = new DataMcuM1(0.0,0,0,0);
var mcuStateL2 = new StateMcu(0,'000','00000000','00000000','00');

var L2charger= new L2Charger(0,0,0,0,0,0,0,0,'000','00000000','00000000','00',0)
var Fcharger = new FCharger(0,0,0,0,0,0,0,0,'000','00000000','00000000','00',0)

/*
This fucntion updates class DataMcuM0 and DataMcuM1

Input = 20 byte serial input as a buffer
            0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
totalBufIn  23 43 c4 20 02 00 00 00 00 01 00 00 a1 0a 00 00 13 13 2a 0a

               0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
dataBufIn      43 c4 20 02 00 00 00 00 01 00 00 9e 0a 00 00
               C  |     |        |      
                  +L2 Controler side State(0000 0000)  
						|		 |		   |||| ||||_____________________________
						|		 |         |||| |||| * Activity State *
						|		 |		   |||| |+[0]-------- connectpr state (MSB)     
						|		 |		   |||| | +[1]------- cpPWM_active
						|		 |		   |||| |  +[2]------ charging_active				  
                        |        |          --dec-  
						|        |          * State *
						|        | 
						|___________________________ 
						+* Networkside request *
						'0000000'
						 |||||||
						 +[0]-------- 0     (MSB)
						  +[1]------- Update Alarm Complete
						   +[2]------ Update Complete
						    +[3]----- Charge Pause
							 +[4]---- Vehicle Check
							  +[5]--- Shedule Charge
							   +[6]-- Stop Charge
							    +[7]- Start (LSB)
						____________________________ 
                                 |
								 |_____________________________________________________
								 + * Power side error *   
                                '0000000'
								 |||||||
								 +[0]-------- trip_GFI---------- Ground Fault
								  +[1]------- trip_OC_L1-------- Over Current Fault
								   +[2]------ error_GFI_test---- GFI Test Failed
								    +[3]----- error_SR_C-------- Stuck Contactor Error
									 +[4]---- error_SR_N-------- Emergency
									  +[5]--- error_SR_L1------- Not used
									   +[6]-- error_UV_L1------- Under Voltage Error
									    +[7]- error_OV_L1------- Over Voltage Error
                                  ______________________________________________________										
                          
*/ 


class Bufloading{
	constructor(startLoading, count, packetReady,color){
		this.startLoading = startLoading
		this.count = count 
		this.packetReady = packetReady 
		this.color = color
	}
}

var countPacketL2 = new Bufloading(0, 0, 0, '\x1b[96m')
var countPacketFC = new Bufloading(0, 0, 0, '\x1b[95m')

var totalBufIn = Buffer.alloc(20);

function mcuMsgDecode(cobj,packet){
	totalBufIn = packet
	
	try{
		
		if(totalBufIn.slice(0,1).toString('hex') == '23'){
			
			console.log(cobj.color)
			console.log('             #  C  ST *  NR *  *  PE *  MG V1 -- V2 -- V3 -- CR C- *  n')
			console.log('In: ',totalBufIn);
			
			
			const msgIdIn = conv.hexToDec(totalBufIn.slice(9,10).toString('hex'));
			const charger = totalBufIn.slice(1,2).toString('utf8')
			
			mcuStateL2.generalError = '0'+mcuStateL2.getGeneralError()[1];
			
			checksmIn = conv.hexToDec(totalBufIn.slice(16,18).swap16().toString('hex'));
			dataBufIn = totalBufIn.slice(1,16);
			
			
			
			if(conv.hexToDec(crc16('MODBUS',dataBufIn).toString(16)) == checksmIn){
				console.log("CRC PASSED");
				console.log('\x1b[0m')
				//Extracting L2 State, Activity State, networkside request, Powerside error,General error
				const decimalVal = parseInt(conv.hexToDec(dataBufIn.slice(1,2).toString('hex')))
				const state = bin2dec(dec2bin(decimalVal).slice(3,8));
				const activityState = dec2bin(decimalVal).slice(0,3)
				const netRequest = dec2bin(parseInt(conv.hexToDec(dataBufIn.slice(3,4).toString('hex'))))
				const powerError = dec2bin(parseInt(conv.hexToDec(dataBufIn.slice(6,7).toString('hex'))))
				const generalError = '00';
				
				switch(charger){
					case 'C': //L2 Charger
						L2charger.state = state
						L2charger.activityState = activityState
						L2charger.netRequest = netRequest
						L2charger.powerError = powerError
						L2charger.generalError = generalError
						
						switch(msgIdIn){
							
							//Extracting L2 Data
							case '0':
								L2charger.volt = parseInt(conv.hexToDec((totalBufIn.slice(10,12).swap16()).toString('hex'))/10);//!Cautious! by doing that you swap 10 12 poitins in totalBufIn itself
								L2charger.curr = parseInt(conv.hexToDec((totalBufIn.slice(12,14).swap16()).toString('hex'))/10);
								L2charger.powr = parseInt(conv.hexToDec((totalBufIn.slice(14,16).swap16()).toString('hex'))/1000);
								break;
							case '1':
								L2charger.kwh = conv.hexToDec(totalBufIn.slice(10,12).swap16().toString('hex'));
								L2charger.t1 = conv.hexToDec(totalBufIn[12].toString(16));
								L2charger.t2 = conv.hexToDec(totalBufIn[13].toString(16));
								L2charger.t3 = conv.hexToDec(totalBufIn[14].toString(16));
								break;
						}
						break;
					case 'c': //Fast Charger
						Fcharger.state = state
						Fcharger.activityState = activityState
						Fcharger.netRequest = netRequest
						Fcharger.powerError = powerError
						Fcharger.generalError = generalError
						
						switch(msgIdIn){
							case '0':
								Fcharger.volt = conv.hexToDec((totalBufIn.slice(10,12).swap16()).toString('hex'));//!Cautious! by doing that you swap 10 12 poitins in totalBufIn itself
								Fcharger.curr = conv.hexToDec((totalBufIn.slice(12,14).swap16()).toString('hex'));
								Fcharger.powr = conv.hexToDec((totalBufIn.slice(14,16).swap16()).toString('hex'));
								break;
							case '1':
								Fcharger.kwh = conv.hexToDec(totalBufIn.slice(10,12).swap16().toString('hex'));
								Fcharger.t1 = conv.hexToDec(totalBufIn[12].toString(16));
								Fcharger.t2 = conv.hexToDec(totalBufIn[13].toString(16));
								Fcharger.t3 = conv.hexToDec(totalBufIn[14].toString(16));
								break;
						}
						break;
						
				}
				
				
			}
			else{
				console.log("CRC FAIL"); 
				console.log('\x1b[0m')
			}
		}
		
		
		
		
	}
	catch(error){
		console.error(error);
		return -1
	}
		
	return 0;
}

function dec2bin(n){
	return n.toString(2).padStart(8,'0')
}

function bin2dec(binStr){
	return parseInt(binStr,2)
}


function mcuMsgEncode(controller,state,stopC,errorC,port,parser){
	
	
	switch(controller){
		/*1 byte*/
		case 'M':selectContBufOut = Buffer.from([0x4D]);break;
		case 'm':selectContBufOut = Buffer.from([0x6D]);break;
		default:selectContBufOut = Buffer.from([0x4D]);break;
	}
	
	switch(state){
		/*1 byte*/
		case 'IDLE':stateCommand  = Buffer.from([0x02]);break;
		case 'PRE_START':stateCommand = Buffer.from([0x04]);break;
		case 'START':stateCommand = Buffer.from([0x05]);break;
		case 'STOP':stateCommand  = Buffer.from([0x06]);break;
		default:stateCommand  = Buffer.from([0x00]);break;
	}
	
	switch(stopC){
		/*1 byte*/
		case 0 : stopCharge = Buffer.from([0x00]);break;
		case 1 : stopCharge = Buffer.from([0x01]);break;
		default: stopCharge = Buffer.from([0x00]);break;
	}
	
	switch(errorC){
		/*1 byte */
		case 'GF':errorCommand  = Buffer.from([0x01]);break;
		case 'OCF':errorCommand = Buffer.from([0x02]);break;
		case 'GFI':errorCommand = Buffer.from([0x03]);break;
		case 'SC':errorCommand  = Buffer.from([0x04]);break;
		case 'UV':errorCommand = Buffer.from([0x05]);break;
		case 'OV':errorCommand = Buffer.from([0x06]);break;
		default:errorCommand  = Buffer.from([0x00]);break;
	}
	
	dataBufOut = Buffer.concat([stateCommand,stopCharge,Buffer.from([0x00,0x00,0x00]),errorCommand,Buffer.from([0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00])],14)
	
	
	/*Get the checksm of 15 bytes of msg. starting from C----- */
	checksmOut = crc16('MODBUS',Buffer.concat([selectContBufOut,dataBufOut],15));
	totalBufOut= Buffer.concat([Buffer.from([0x23]),selectContBufOut,dataBufOut, Buffer.from(checksmOut.toString(16).padStart(4,'0'),'hex').swap16(),Buffer.from([0x2a,0x0a])],20);
	
	
	if(port.path == "/dev/ttyS1"){
		console.log('\x1b[35m')
		console.log('              #  M  ST SP *  *  *  PE  *  *  *  *  *  *  *  *  CR C- *  n --> FC')
		console.log("Out: ", totalBufOut,port.path,port.baudRate);
		console.log('\x1b[0m')
		}
	else if(port.path == "/dev/ttyS2"){
		console.log('\x1b[36m')
		console.log('              #  M  ST SP *  *  *  PE  *  *  *  *  *  *  *  *  CR C- *  n --> L2')
		console.log("Out: ", totalBufOut,port.path,port.baudRate);
		console.log('\x1b[0m')
	}
	
	try{
		port.write(totalBufOut, function(err) {
			if (err) {
				return console.log('Error on write: ', err.message)
				} 
				//console.log(totalBufOut.toString('hex'));
			});
		}
	
	catch(error){
		console.error(error);
		return -1
		}
	return 0;
}

/*

function dmgt1MsgEncode(page,data,port,parser){
	switch(page){
		case '00':totalBuftoDMG = Buffer.from([0x5A,0xA5,0x07,0x82,0x00,0x84,0x5A,0x01,0x00,0x00]);break;
		case '01':totalBuftoDMG = Buffer.from([0x5A,0xA5,0x07,0x82,0x00,0x84,0x5A,0x01,0x00,0x0A]);break;
		default:
			totalBuftoDMG = Buffer.from([0x5A,0xA5,0x07,0x82,0x00,0x84,0x5A,0x01,0x00,0x00]);
			break;
	}
	
	console.log(totalBuftoDMG);
	try{
		port.write(totalBuftoDMG, function(err) {
			if (err) {
				return console.log('Error on write: ', err.message)
				} 
				//console.log(totalBufOut.toString('hex'));
			});
		}
	
	catch(error){
		console.error(error);
		return -1
		}
	return 0;
	
}
*/

function getMCUData(what){
	switch(what){
		case 'msgId0':
			return mcuDataM0.getData();break;
		case 'msgId1':
			return mcuDataM1.getData();break;
		case 'stateL2' :
			return mcuStateL2.getState();break;
		case 'activityState':
			return mcuStateL2.getActivityState();break;
		case 'netRequestL2':
			return mcuStateL2.getNetRequet();break;
		case 'powerErrorL2':
			return mcuStateL2.getpowerError();break;
		case 'genErrorL2':
			return mcuStateL2.getGeneralError();break;
		
		default :
			return [0,0,0,0];break;
			
	}
}

//checking serial errors  4 sec interval
let serialIncheckID = setInterval(()=>{
	mcuStateL2.generalError = '1'+mcuStateL2.getGeneralError()[1];
	},4000);

module.exports = {mcuMsgDecode,mcuMsgEncode,getMCUData,L2charger,Fcharger,countPacketL2,countPacketFC};
