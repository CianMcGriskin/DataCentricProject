const express = require('express')
const mysql = require('mysql2')
const app = express()
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');

// Parse the request body for POST requests
app.use(bodyParser.urlencoded({ extended: false }))

// Establish a connection to the MySQL database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'proj2022'
})

// Homepage route
app.get('/', (req, res) => {
  // Send a response with links to view employees, departments, and employees in MongoDB
  res.send(`
      <a href="/employees">View Employees</a>
      <br>
      <a href="/departments">View Departments</a>
      <br>
      <a href="/employeesmongo">View Employees (MongoDB)</a>
  `)
})
  
// Route to view employees from the MySQL database
app.get('/employees', (req, res) => {
  // Get employee data from DB
  connection.query('SELECT * FROM employee', (err, results) => {
    if (err) throw err

    // Build the table
    let html = '<h1>Employees</h1>'
    html += '<table>'
    html += '<tr>'
    html += '<th>EID</th>'
    html += '<th>NAME</th>'
    html += '<th>ROLE</th>'
    html += '<th>SALARY</th>'
    html += '<th>UPDATE</th>'
    html += '</tr>'

    // Add row for every employee
    results.forEach(employee => {
      html += '<tr>'
      html += `<td>${employee.eid}</td>`
      html += `<td>${employee.ename}</td>`
      html += `<td>${employee.role}</td>`
      html += `<td>${employee.salary}</td>`
      html += `<td><a href="/employees/edit/${employee.eid}">Update</a></td>`
      html += '</tr>'
    })
    
    html += '</table>'
    html += '<br><a href="/">Home</a>'
    // html response
    res.send(html)
  })
})
  
// Route to view departments from the MySQL database
app.get('/departments', (req, res) => {
  let html = '<h1>Departments</h1>'
  // Query the dept table
  connection.query('SELECT * FROM dept', (err, results) => {
    if (err) throw err
    let html = '<h1>List of Departments</h1>'
    html += '<table>'
    html += '<tr>'
    html += '<th>DID</th>'
    html += '<th>Name</th>'
    html += '<th>Budget</th>'
    html += '<th>Location</th>'
    html += '<th>Delete</th>'
    html += '</tr>'
    // Add row for every employee
    results.forEach(dept => {
      html += '<tr>'
      html += `<td>${dept.did}</td>`
      html += `<td>${dept.dname}</td>`
      html += `<td>${dept.lid}</td>`
      html += `<td>${dept.budget}</td>`
      html += `<td><a href="/department/delete/${dept.did}">Delete</a></td>`
      html += '</tr>'
    })

    html += '</table>'
    html += '<br><a href="/">Home</a>'
    // html response
    res.send(html)
  })
})

// Route to display a form to edit an employee's details
app.get('/employees/edit/:eid', (req, res) => {
   // Get employee ID
  const eid = req.params.eid
  
  // Get employee details from DB
  connection.query('SELECT * FROM employee WHERE eid = ?', [eid], (err, results) => {
    if (err) throw err
    // Get the first result (there should only be one)
    const employee = results[0] 
    // Build the form
    let html = '<h1>Edit Employee</h1>'
    html += '<form action="/employees/update/' + eid + '" method="POST">'
    html += '<label>EID:</label><br>'
    html += '<input type="text" name="eid" value="' + eid + '"readonly><br>'
    html += '<label>Name:</label><br>'
    html += '<input type="text" name="ename" minlength="5" value="' + employee.ename + '"><br>'
    html += '<label>Role:</label><br>'
    // html += '<input type="text" name="role" id="role" list="roles" value="' + employee.role + '"><br>'
    html += '<select name="role" id="role" value="' + employee.role + '"> <option value="Manager">Manager</option> <option value="Employee">Employee</option></select><br>'
    html += '<label for="salary">Salary:</label><br>'
    html += '<input type="number" name="salary" min="1" step=".01" value="' + employee.salary + '"><br><br>'
    html += '<input type="submit" value="Update">'
    html += '</form>'
    // Respond with HTML
    res.send(html)
  })
})

// Route to update an employee's details in the MySQL database
app.post('/employees/update/:eid', (req, res) => {
  // Get the employee ID from the URL parameter
  const eid = req.params.eid     
  // Get the employee details from the request body
  const employeeData = req.body
  // Update the employee's details in the database
  connection.query('UPDATE employee SET ename = ?, role = ?, salary = ? WHERE eid = ?', [employeeData.ename, employeeData.role, employeeData.salary, eid], (err, results) => {
    if (err) throw err   
    // Redirect the user back to the list of employees
    res.redirect('/employees')
  })
})

// Delete a certain department based on its ID
app.get('/department/delete/:did', (req, res) => {
  const departmentId = req.params.did
  // logic for deleteing specific deparment
  connection.query('SELECT * FROM emp_dept WHERE did = ?', [departmentId], (error, results, fields) => {
    if (error) {
      console.error(error);
    } else if (results.length > 0) {
      res.send(`<h1>Error:</h1> <p>There are employees associated with ${departmentId}. This department cannot be deleted.</p>`);
    } else {
      connection.query('DELETE FROM dept WHERE did = ?', [departmentId], (err, results) => { 
        if (err) throw err;
        res.send(`<p>Successfully deleted department ${departmentId}.</p>`);
      })
    }
  })
})

// Route to view employees from the MongoDB database
app.get('/employeesmongo', (req, res) => {
   // Connect to the MongoDB database
  MongoClient.connect('mongodb://localhost:27017/employeesDB', (err, client) => {
    if (err) throw err

     // Access the employee collection
    const db = client.db('employeesDB')
    db.collection('employees').find().toArray((err, result) => {
      if (err) throw err
      let html = '<h1>Employees (MongoDB)</h1>'
      html += '<a href="/employeesmongo/add">Add Employee</a>'
      html += '<table><thead><tr><th>EID</th><th>Phone</th><th>Email</th></tr></thead><tbody>'
      // Loop through the documents and add a row to the table for each document
      result.forEach(doc => {
        html += `<tr><td>${doc._id}</td><td>${doc.phone}</td><td>${doc.email}</td></tr>`
      })

      html += '</tbody></table>'
      html += '<br><a href="/">Home</a>'
      res.send(html)
    })
  })
})

// Add an employee to MongoDB
app.get('/employeesmongo/add', (req, res) => {
  // Form to add Employee
  let html = '<h1>Add Employee (MongoDB) </h1>'
  html += '<form action="/employeesmongo/add/submit" method="POST"> EID: <input type="text" maxlenght="4" name="_id" required><br>'
  html += 'Phone: <input type="text" min="6" name="phone"><br>'
  html += 'Email: <input type="email" name="email"><br><input type="submit" value="Add"></form>'
  html += '<br><a href="/">Home</a>'
  res.send(html)
})

// Submit the new empllyee data to the MongoDB
app.post('/employeesmongo/add/submit', (req, res) => {
  let errors = []
  MongoClient.connect('mongodb://localhost:27017/employeesDB', (err, client) => {
    // Get the data from the form submission
    const data = req.body
    const db = client.db('employeesDB')

    // Logic to check if all inputs are valid
    if (data._id.length < 4 || data._id.length >= 5) {
      errors.push('ID must have 4 characters')
    }

    if (data.phone.length < 6) {
      errors.push('Phone must have more than 5 characters')
    }

    if(ValidateEmail(data.email) == false){
      errors.push('Email is invalid')
    }

    // Variable that holds refernece to the employees database
    const collection = client.db('employeesDB').collection('employees');

    if(collection.findOne({_id: data._id}),(err, result) => {
      if (err) {
        console.error(err);
        return;
      }

      // Throw error if ID already exists
      if (result)
        errors.push('Duplicate ID Entered') 
    });


    // Check wheter id exsists in the DB
    const sql = `SELECT * FROM employee WHERE eid = ?`
    connection.query(sql, [data._id], (error, results, fields) => {
      if (err) throw err
      if(results.length == 0)
        {errors.push('ID not found in mysql') }
    

      if (errors.length > 0) {
        res.send('<h1>Error:</h1><a href="/employeesmongo">Employees (MongoDB)</a><br>' + errors.join('<br>'))
      } else {
        // Insert the data into the "employees" collection
        db.collection('employees').insertOne(data)
        res.redirect('/employeesmongo')
      }
    });
  })
})

//Validate Email function - https://www.w3resource.com/javascript/form/email-validation.php
function ValidateEmail(email) {
  // Check if the email contains an @ symbol and a dot (.)
  if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    // If the email matches the above pattern, we can safely assume that it is valid
    return true;
  }
  // Otherwise, the email is not valid
  return false;
}

app.listen(3000)