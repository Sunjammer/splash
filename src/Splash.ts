import colors = require('colors/safe')
import Commander = require('commander');
import Configstore = require('configstore')
import Confirm = require('prompt-confirm')
import FS = require('fs-extra')
import Path = require('path')

const pkg = require('../package.json');
const conf = new Configstore(pkg.name);

function dirIsEmpty(dir:string):boolean{
    const files = FS.readdirSync(dir);
    return files.length==0;
}

function spawn(source:string, target:string){
    if(!FS.pathExistsSync(source))
        throw 'Template source directory does not exist'
    if(typeof target === "string"){
        target = process.cwd()+Path.sep+target
        console.log(colors.gray("Creating directory "+target))
        FS.ensureDirSync(target)
    }else{
        target = process.cwd()
    }
    const options = { overwrite:false }
    console.log(colors.gray("About to copy ")+colors.white(source)+" into "+colors.white(target))
    if(!dirIsEmpty(target)){
        console.log(colors.yellow("Target directory not empty!"))
        new Confirm("Abort?").ask(answer => {
            if(!answer){
                new Confirm("Overwrite existing files?").ask(answer => {
                    if(answer){
                        console.log(colors.yellow('Overwriting duplicate files if any...'))
                        options.overwrite = true
                    }else{
                        console.log(colors.yellow('Keeping duplicate files if any...'))
                    }
                    FS.copySync(source, target, options)
                    console.log(colors.green('Done'))
                })
            }else{
                console.log(colors.red('Aborted'))
            }
        })
    }else{
        FS.copySync(source, target, options)
        console.log(colors.green('Done'))
    }
}

export default class Splash{
    public static run(){
        Commander
            .name("splash")
            .version('0.0.1')
            .usage('<template> [targetdir]| map <name> | unmap <name> | list')
            .description('Splash or define a template')
            .action((name, tgt) => {
                if(conf.has('list')){
                    let c = conf.get('list')
                    for(let k in c)
                        if(k==name){
                            spawn(c[k], tgt)
                            return
                        }
                }
                console.error("No such template")
            })

        Commander.command('map <name>')
            .description('Map cwd to template name')
            .action(arg => {
                let c = {}
                if(conf.has('list'))
                    c = conf.get('list')
                let target = process.cwd()
                for(let k in c){
                    if(c[k] == target){
                        delete(c[k])
                        console.log(colors.red("Removed duplicate ("+k+")"))
                    }
                }
                c[arg] = target
                conf.set({list:c})
                console.log(colors.green("Mapped "+c[arg]+" to '"+arg+"'"))
            })
        
            

        Commander.command('unmap <name>')
        .description('Forget a template')
        .action(arg => {
            let c = {}
            if(conf.has('list'))
                c = conf.get('list')
            delete(c[arg])
            conf.set({list:c})
            console.log(colors.green("Unmapped '"+arg+"'"))
        })

        Commander.command('clear')
            .description('Forget all templates')
            .action(() => {
                conf.clear()
                console.log(colors.green("Done"))
            })

        Commander.command('list')
            .description('List mapped templates')
            .action(args => {
                if(conf.has('list'))
                {
                    const l = conf.get('list')
                    console.log('Template mappings:')
                    for(let k in l){
                        console.log("\t"+colors.green(k)+" => "+colors.magenta(l[k]))
                    }
                }
            })

        
        if (!process.argv.slice(2).length) {
            Commander.outputHelp();
        }

        Commander.parse(process.argv);
    }
}