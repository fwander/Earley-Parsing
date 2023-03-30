import HashSet from "./HashSet";

type Rule = {
  lhs: Symbol;
  rhs: Symbol[];
}

type Item = {
  rule: Rule;
  dot: number;
  from: number;
  concrete: boolean;
  forest: ParseForest;
}

function item_hash(item: Item): string{
  let ret = "";
  ret += Symbol[item.rule.lhs];
  ret += ","
  for (let i = 0; i < item.rule.rhs.length; i++) {
    if (item.dot === i) {
      ret += ".";
    }
    ret += Symbol[item.rule.rhs[i]];
    ret += ",";
  }
  if (item.dot === item.rule.rhs.length) {
    ret += "."
  }
  ret += item.from.toString()
  if (item.concrete) {
    ret += "!";
  }
  return ret;
}

function item_str(item: Item): string{
  let ret = "";
  ret += Symbol[item.rule.lhs];
  ret += " -> "
  for (let i = 0; i < item.rule.rhs.length; i++) {
    if (item.dot === i) {
      ret += ". ";
    }
    ret += Symbol[item.rule.rhs[i]];
    ret += " ";
  }
  if (item.dot === item.rule.rhs.length) {
    ret += ". "
  }
  ret += "(" + item.from.toString() + ")";
  if (item.concrete) {
    ret += "!";
  }
  return ret;
}

/*
S -> A | AA
A -> a | aa
*/

//Begin Generated

enum Symbol {
  a,
  b,
  c,
  S,
  A,
  B,
  C,
};

const grammar: Rule[][] = [
  [ //S
    {lhs: Symbol.S, rhs: [Symbol.A]},
  ], 
  [ //A
    {lhs: Symbol.A, rhs: [Symbol.B]},
    {lhs: Symbol.A, rhs: [Symbol.C]},
  ],
  [ //B
    {lhs: Symbol.B, rhs: [Symbol.A, Symbol.b, Symbol.A]},
  ],
  [ //C
    {lhs: Symbol.C, rhs: [Symbol.a]},
    {lhs: Symbol.C, rhs: [Symbol.c]},
  ],
]

const nullable: boolean[] = [
  false,
  false,
  false,
  false,
]

const grammar_start = Symbol.S;

function is_term(s: Symbol){
  return s <= Symbol.c;
}

//End Generated

class ParseForest {
  children: Map<ParseForest, number>[] = [];
  data:Symbol;
  start:number;
  flatten_memo: ParseTree[] = [];
  id: number;
  static last_id = 0;
  constructor(data: Symbol, start: number, rhs?: Symbol[]){
    this.data = data;
    this.start = start;
    if (rhs) {
      for (const symbol of rhs) {
        this.children.push(new Map([[new ParseForest(symbol,-1),1]]));
      }
    }
    this.id = ParseForest.last_id++;
  }
  add_child(index: number, child: ParseForest) {
    let proper_start = this.start;

    //if (child.start !== proper_start) return;
    //if (this.children[index+1] && this.children[index+1][0]) {
      //const next_child = this.children[index+1][0]
      //const proper_end = this.children[index+1][0].start;
      //if (child.end !== proper_end) return;
    //}

    let amount = this.children[index].get(child) ?? 0;
    this.children[index].set(child,amount + 1);
    //if (this.children.length - 1 == index && child.end > child.start) {
      //this.end = child.end;
    //}
  }
  to_string() {
    let ret = "";
    function to_string_helper(indent: string, forest: ParseForest, depth: number) {
      if (depth === 0) return;
      ret += indent + "(" + forest.start + ")";
      ret += Symbol[forest.data];
      let i = 0;
      for (const possibilties of forest.children) {
        ret+= "\n";
        ret += indent + i.toString() + ":"
        i++;
        for (const child of possibilties) {
          ret+= "\n";
          to_string_helper(indent + "\t", child[0], depth-1);
        }
      }
    }
    to_string_helper("",this,5);
    return ret;
  }

  flatten(indent: string = "", edge_context: Map<ParseForest,Map<ParseForest, number>> = new Map()): ParseTree[] {
    if (DEBUG)
    console.log(indent + "flattening: " + Symbol[this.data] + "." + this.id + (this.start === -1 ? "?" : ""));
    if (this.flatten_memo.length !== 0) {
      if (DEBUG){
        for (const tree of this.flatten_memo) {
          console.log(ptree_str(tree, indent+"\t"));
        }
      }
      return this.flatten_memo;
    }
    if (this.children.length === 0){
      return [{children: [], data: this.data, num_imagined: (this.start === -1)? 1: 0, start: this.start, end: this.start+1}];
    }
    let child_forests: ParseTree[][] = [];
    for (let i = 0; i < this.children.length; i++){
      if (DEBUG)
        console.log(indent + "\t" + i.toString());
      child_forests[i] = [];
      for (const child_forest of this.children[i]) {
        if (edge_context.get(this)?.get(child_forest[0]) !== child_forest[1]) {
          let map = edge_context.get(this);
          if (!map) {
            let adding = new Map();
            edge_context.set(this, adding);
            map = adding;
          }
          map.set(child_forest[0],(map.get(child_forest[0]) ?? 0) + 1);
          child_forests[i].push(...child_forest[0].flatten(indent + "\t", edge_context));
          map.set(child_forest[0],(map.get(child_forest[0]) ?? 0) - 1);
        }
        else if (DEBUG){
          console.log(indent + "\tskipped:" + Symbol[child_forest[0].data] + "." + child_forest[0].id);
        }
      }
    }
    let ret: ParseTree[] = [];
    let next_ret: ParseTree[] = [];
    ret.push({children: [], data: this.data, num_imagined: 0, start: this.start, end: this.start})
    for (let i = 0; i < this.children.length; i++){
      for (const ret_tree of ret){
        for (const tree of child_forests[i]){
          if (tree.start === ret_tree.end || tree.start === -1){
            let next_end = (tree.start === -1)? ret_tree.end : tree.end;
            next_ret.push({
              children: ret_tree.children.concat([tree]), 
              num_imagined: ret_tree.num_imagined+tree.num_imagined, 
              data: this.data, 
              start: this.start, 
              end: next_end
            });
          }
        }
      }
      ret = next_ret.filter((t)=>t.children.length === i+1);
    }
    function has_conversion(t: ParseTree, s: Symbol) : boolean{
      let scc = undefined; //single concrete child
      for (const child of t.children) {
        if (child.start !== -1) {
          if (scc !== undefined) { //not a conversion
            return false;
          }
          scc = child;
        }
      }
      if (scc === undefined) {
        return false;
      }
      if (scc.data === s) {
        return true;
      }
      return has_conversion(scc,s);
    }

    let min_imagined: {[key: number]: number} = {};
    for (const tree of ret) {
      const current = min_imagined[tree.end];
      if ((current === undefined) || current > tree.num_imagined) {
        min_imagined[tree.end] = tree.num_imagined;
      }
    }

    console.log(min_imagined);


    function filter(t: ParseTree) {
      if (t.end === t.start) return false;
      if (has_conversion(t,t.data)) return false;
      if (t.num_imagined > min_imagined[t.end]) return false;

      //TODO maybe restrict parses to left most here?
      return true;
    }


    ret = ret.filter(filter);

    if (DEBUG)
    for (const tree of ret) {
      console.log(ptree_str(tree, indent + "\t"));
      console.log(tree.end, tree.num_imagined);
    }


    
    this.flatten_memo = ret.map((x)=>x);
    return ret;
  }
}

type ParseTree = {
  children: ParseTree[];
  data: Symbol;
  num_imagined: number;
  start: number;
  end: number;
}

function ptree_str(t: ParseTree, indent = ""){
  let ret = "";
  function helper(t: ParseTree, ind: string){
    ret += ind;
    ret += Symbol[t.data];
    if (t.start === -1) {
      ret += "?";
    }
    ret += "\n";
    for (const child of t.children) {
      helper(child,ind+"\t");
    }
  }
  helper(t,indent);
  return ret;
}

function add_item(state_set: HashSet<Item>, unprocessed: Item[], adding: Item) {
  if (state_set.has(adding)) {
    return;
  }
  unprocessed.push(adding);
  state_set.add(adding);
}

const DEBUG = true;

export function parse(stream: Symbol[]){
  const len = stream.length;
  let state_sets: HashSet<Item>[] = new Array(len+1).fill(0).map(() => new HashSet<Item>(item_hash));
  grammar[0].forEach((rule)=>{
    state_sets[0].add({rule: rule, dot: 0, from: 0, concrete: false, forest: new ParseForest(grammar_start,0,rule.rhs)})
  });

  for (let i = 0; i <= len; i++) {
    let unprocessed: Item[] = state_sets[i].to_array();
    while(unprocessed.length > 0){
      const item: Item = unprocessed.pop() as Item;
      const next_symbol = item.rule.rhs[item.dot];
      if (item.dot != item.rule.rhs.length) {
        add_item(state_sets[i], unprocessed, {
          rule: item.rule, 
          dot: item.dot+1, 
          from: item.from,
          concrete: item.concrete,
          forest: item.forest, 
        });
      }
      if (is_term(next_symbol) && next_symbol === stream[i] && i < len){ //scan
        // if(DEBUG) {
        //   console.log("scanned:", item_str(item));
        // }
        let new_tree = new ParseForest(stream[i],i);
        item.forest.add_child(item.dot,new_tree);
        state_sets[i+1].add({
          rule: item.rule,
          dot: item.dot+1,
          from: item.from,
          // nodes contining stream token are concrete
          concrete: true,
          forest: item.forest,
        });
        continue;
      }
      if (next_symbol && !is_term(next_symbol)) { //predict
        // if(DEBUG) {
        //   console.log("predicting:", item_str(item));
        // }
        for (const rule of grammar[next_symbol - grammar_start]) {
          let parse_forest = new ParseForest(rule.lhs,i, rule.rhs);
          add_item(state_sets[i], unprocessed, {
            rule: rule, 
            dot: 0, 
            from: i,
            // Nodes aren't concrete if they don't have concrete children -- and when we add the new items, they don't
            concrete: false,
            forest: parse_forest,
          });
        }
        continue;
      }
      if (item.concrete && item.dot === item.rule.rhs.length) { //complete
        // if(DEBUG) {
        //   console.log("complete:", item_str(item));
        // }
        for (const checking of state_sets[item.from].to_array()) {
          if (checking.rule.rhs[checking.dot] === item.rule.lhs){
            checking.forest.add_child(checking.dot, item.forest);
            add_item(state_sets[i], unprocessed, {
              rule: checking.rule, 
              dot: checking.dot + 1, 
              from: checking.from,
              // Concreteness propagates up the tree
              concrete: true, 
              forest: checking.forest,
            });
          }
        }
        continue;
      }
    }
    if(DEBUG){
      console.log("==="+i.toString()+"===");
      for (const item of state_sets[i].to_array())
        console.log(item_str(item));
    }
  }
  //if (DEBUG) {
    for (const item of state_sets[0].to_array()){
      if(item.rule.lhs === grammar_start && item.dot === 0){
        let parses = item.forest.flatten();
        for (const parse of parses) {
          if (parse.start === 0 && parse.end === stream.length){
            console.log("--------------------------------");
            console.log(ptree_str(parse));
          }
        }
      }
    }
  //}
};

export function tokenize(stream: string){
  let ret: Symbol[] = [];
  for (const c of stream) {
    switch (c) {
      case 'a':
        ret.push(Symbol.a);
        break;
      case 'b':
        ret.push(Symbol.b);
        break;
      case 'c':
        ret.push(Symbol.c);
        break;
      default:
        break;
    }
  }
  return ret;
}

