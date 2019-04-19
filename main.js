var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var mime = require('mime');
var ejs = require('ejs');
var sqlite3 = require('sqlite3').verbose();

var routs = {
    '/': index,
    '/index': index,
    '/all/posts': all_posts,
    '/get/post': get_post,
    '/new/post': new_post,
    '/edit/post': edit_post,
    '/delete/post': delete_post
}

function index(params, request, response)
{
    render('template/index.ejs', request, response);
}

function get_post(params, request, response)
{
    var db = createDB();

    if('id' in params)
    {
        var id = params['id'];

        db.get('SELECT * FROM posts WHERE id=?', [id], function(err, row) {
            if(err)
            {
                console.log(err);
            }
            else
            {
                var content = "{\n";
                content += "\"param\": {\"id\": "+row['id']+", \"post\": \""+row['post']+"\"}\n";
                content += "}\n";
                response.writeHead(200, {"Content-Type": "application/json", "Content-Length": content.length});
                response.end(content);
                db.close();
            }
        });
    }
    else
    {
        var content = "{\"param\": null}\n";
        response.writeHead(200, {"Content-Type": "application/json", "Content-Length": content.length});
        response.end(content);
    }
}

function all_posts(params, request, response)
{
    var db = createDB();
    db.all('SELECT * FROM posts', function(err, rows) {

        if(rows.length > 0)
        {
            var contents = "{\n";
            contents += "\"params\": [\n";
            for(i = 0; i < rows.length-1; i++)
            {
                contents += "{\"id\": "+rows[i].id+", \"post\": \""+rows[i].post+"\"},\n";
            }
            contents += "{\"id\": "+rows[rows.length-1].id+", \"post\": \""+rows[rows.length-1].post+"\"}\n";
            contents += "]\n";
            contents += "}\n";
            response.writeHead(200, {'Content-Type': 'application/json', 'Content-Length': contents.length});
            response.end(contents);
        }
        else
        {
            var contents = "{\n";
            contents += "\"params\": []\n";
            contents += "}\n";
            response.writeHead(200, {'Content-Type': 'application/json', 'Content-Length': contents.length});
            response.end(contents);
        }
        db.close();
    });
}

function new_post(params, request, response)
{
//response.end();
    var db = createDB();
    var post = params['post'];

    db.run('INSERT INTO posts(post) VALUES (?)', [post], function(err) {
        if(err)
        {
            console.log(err.message);
        }
        else
        {
            db.close();
            response.end();
        }
    });
}

function edit_post(params, request, response)
{
    var id = params['id'];
    var post = params['post'];
    var db = createDB();

    db.run('UPDATE posts SET post=? WHERE id=?', [post, id], function(err) {
        if(err)
        {
            console.log(err.message);
            response.end();
        }
        else
        {
            db.close();
            response.end();
        }
    });
}

function delete_post(params, request, response)
{
    var id = params['id'];
    var db = createDB();
    console.log(id);

    db.run('DELETE FROM posts WHERE id=?', [id], function(err) {
        if(err)
        {
            console.log(err.message);
            response.end();
        }
        else
        {
            db.close();
            response.end();
        }
    })
}

function createDB()
{
    return new sqlite3.Database('base.db');
}

function renderHelper(request, response, content, err)
{
    if(err)
    {
        console.error(err);
        response.end();
    }
    else
    {
        response.writeHead(200, {'Content-Type': 'text/html', 'Content-Length': content.length});
        response.end(content);
    }
}

function render(path, request, response, obj=null)
{
    if(obj)
    {
        ejs.renderFile(path, obj, function(err, str) {
            renderHelper(request, response, str, err);
        });
    }
    else
    {
        ejs.renderFile(path, function(err, str) {
            renderHelper(request, response, str, err);
        });
    }
}

function post(request, response)
{
    var u = request.url;
    u = url.parse(u).pathname;

    var body = '';

    request.on('data', function(data) {
        body += data;
    });

    request.on('end', function(data) {
        //var params = qs.parse(body);
        var params = JSON.parse(body);

        if(routs[u])
        {
            routs[u](params, request, response);
        }
    });
}

function get(request, response)
{
    var u = request.url;
    var params = url.parse(u, true).query;
    u = url.parse(u).pathname;

    if(routs[u])
    {
        routs[u](params, request, response);
    }
    else if(u.startsWith('/static'))
    {
        console.log(mime.getType(u));
        try
        {
            fs.readFile('.'+u, function(err, data) {
                if(err)
                {
                    console.error(err);
                    response.end();
                }
                else
                {
                    response.writeHead(200, {'Content-Type': mime.getType(u), 'Content-Length': data.length});
                    response.end(data);
                }
            });
        }
        catch(e)
        {
            console.log(e);
        }
    }
    else
    {
        var contents = '<!doctype html><html><head><title>404 Not Found!</title></head><body><h1>404 Not Found!</h1><p>Cant find resource.</p></body></html>';
        response.writeHead(404, {'Content-Type': 'text/html', 'Content-Length': contents.length});
        response.end(contents);
    }
}

function listener(request, response)
{
    if(request.method == 'POST')
    {
        post(request, response);
    }
    else if(request.method == 'GET')
    {
        get(request, response);
    }
}

var server = http.createServer(listener);
server.listen(8080);
console.log('Running Application at http://localhost:8080');