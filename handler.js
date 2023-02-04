'use strict';
const serverless = require('serverless-http');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');


/* Cuando se ejecuta en modo OFFLINE */
const SERVICES_TABLE = process.env.SERVICES_TABLE
const IS_OFFLINE = process.env.IS_OFFLINE
let dynamoDB;

if(IS_OFFLINE ==true){
  dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000'
  });
}else{
  dynamoDB = new AWS.DynamoDB.DocumentClient();
}



app.use(bodyParser.urlencoded({ extended: true }));


/* Metodo POST */
app.post('/services', (req, res)=>{
  const serviceId = uuidv4();
  const {author,title, description,rate,imageUrl} = req.body;
  const params = {
    TableName: SERVICES_TABLE,
    Item: {
      serviceId,
      author,
      title,
      description,
      rate,
      imageUrl
    }
  };

  dynamoDB.put(params, (error)=>{
    if(error){
      console.log(error);
      res.status(400).json({
        error: 'No se ha podido crear el servicio'
      })
    }else{
      res.json({serviceId,author,title, description,rate,imageUrl});
    }
  });

});


/* Metodo PUT*/
app.put('/services/:serviceId', (req, res)=>{
  const {serviceId} = req.params;
  const {author,title, description,rate,imageUrl} = req.body;

  const params = {
    TableName: SERVICES_TABLE,
    Key: {
      serviceId
    },
    UpdateExpression: "set author = :author, title = :title, description = :description, rate = :rate, imageUrl = :imageUrl",
    ExpressionAttributeValues: {
      ":author": author,
      ":title": title,
      ":description": description,
      ":rate": rate,
      ":imageUrl": imageUrl
    },
    ReturnValues: "UPDATED_NEW"
  };

  dynamoDB.update(params, (error, data)=>{
    if(error){
      console.log(error);
      res.status(400).json({
        error: 'No se ha podido actualizar el servicio'
      })
    }else{
      res.json(data);
    }
  });
});

/* Metodo PUT para la califar un servicio*/
app.put('/services/rate/:serviceId', (req, res)=>{
  const {serviceId} = req.params;
  const {rate} = req.body;
  const params = {
    TableName: SERVICES_TABLE,
    Key: {
      serviceId: req.params.serviceId
    }
  }
  dynamoDB.get(params, (error, data)=>{
    if(error){
      console.log(error);
      res.status(400).json({
        error: 'No se ha podido obtener el servicio'
      });
    } else {
      const oldRate = data.Item.rate;
      const medianRate = Math.round((parseInt(oldRate) + parseInt(rate)) / 2);

      const putParams = {
        TableName: SERVICES_TABLE,
        Key: {
          serviceId
        },
        UpdateExpression: "set rate = :rate",
        ExpressionAttributeValues: {
          ":rate": medianRate
        },
        ReturnValues: "UPDATED_NEW"
      };

      dynamoDB.update(putParams, (error, data) => {
        if (error) {
          console.log(error);
          res.status(400).json({
            error: 'No se ha podido actualizar el servicio'
          });
        } else {
          res.json(data);
        }
      });
    }
  })
});

/* Metodo GET para todos los servicios*/
app.get('/services', (req,res)=>{

  const params = {
    TableName: SERVICES_TABLE
  }

  dynamoDB.scan(params, (error, result)=>{
    if(error){
      console.log(error);
      res.status(400).json({
        error: 'No se ha podido obtener servicios'
      })
    }else{
      const {Items} = result;
      res.json({
        success: true,
        message: 'Usuarios cargados correctamente',
        services: Items
      });
    }
  })
})

/* Metodo GET para un servicio en especifico*/
app.get('/services/:serviceId', (req,res)=>{
  
  const params = {
    TableName: SERVICES_TABLE,
    Key: {
      serviceId: req.params.serviceId
    }
  }

  dynamoDB.get(params, (error, result)=>{
    if(error){
      console.log(error);
      res.status(400).json({
        error: 'No se ha podido obtener el servicio'
      })
    }if(result.Item){
      const {serviceId, author,title, description,rate,imageUrl} = result.Item;
      return res.json({serviceId, author,title, description,rate,imageUrl});
    }else{
      res.status(404).json({
        error: 'Servicio no encontrado'
      })
    }
  })
})

/* Metodo DELETE*/
app.delete('/services/:serviceId', (req, res)=>{
  const {serviceId} = req.params;

  const params = {
    TableName: SERVICES_TABLE,
    Key: {
      serviceId
    }
  };

  dynamoDB.delete(params, (error)=>{
    if(error){
      console.log(error);
      res.status(400).json({
        error: 'No se ha podido eliminar el servicio'
      })
    }else{
      res.json({message: 'Servicio eliminado exitosamente'});
    }
  });
});



module.exports.generic = serverless(app)