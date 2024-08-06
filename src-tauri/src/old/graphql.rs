use std::collections::HashMap;

use serde_json::Value;

use crate::prefs;

pub struct GraphqlData {

}

#[tauri::command]
pub fn parse_graphql(app: tauri::AppHandle) {
  let prefs = prefs::Prefs::create(&app).unwrap();
  _parse_graphql(&prefs);
}

fn _parse_graphql(prefs: &prefs::Prefs) {
    let hub_path = prefs.hub_appdata_path.clone().unwrap();
    let graphql_cache_path = hub_path.join("graphqlCache");
    
    // read single file in folder
    let graphql_file = std::fs::read_dir(graphql_cache_path).unwrap().nth(0).unwrap().unwrap().path();

    let contents = std::fs::read_to_string(graphql_file).unwrap();
    let parsed: HashMap<String, Value> = serde_json::from_str(&contents).unwrap();

    let mut urls = Vec::new();

    #[derive(Debug)]
    struct Found(String, String);

    for (i, key) in parsed.keys().enumerate() {
        if key.starts_with("TemplateFile:") && key.ends_with(".url") {
            // read ahead to find editor version
            let mut found_version: Option<String> = None;
            // overflows :)
            for j in (i - 50)..(i - 1) {
                if j < 0 {
                    break;
                }
            // for j in i..(i + 50) {
                let j_key = parsed.keys().nth(j).unwrap();
                if j_key.contains("supportedUnityEditorVersions") {
                    let substring = j_key.split("supportedUnityEditorVersions").nth(1).unwrap();
                    let substring = substring.split("[").nth(1).unwrap();
                    let substring = substring.split("]").nth(0).unwrap();
                    // println!("{}: {}", key.replace("%2e", "."), substring.replace("%2e", "."));
                    found_version = Some(substring.replace("%2e", "."));
                    break;
                }
            }

            if let None = found_version {
                // println!("{}: not found", key.replace("%2e", "."));
                continue;
            }
            
            urls.push(Found(parsed.get(key).unwrap().as_str().unwrap().to_string(), found_version.unwrap()));
        }
    }

    println!("done!");
    
    // let mut urls = parsed.keys()
    //     .filter(|x| x.starts_with("TemplateFile:"))
    //     .filter(|x| x.ends_with(".url"))
    //     .map(|x| parsed.get(x).unwrap().as_str().unwrap().to_string())
    //     .collect::<Vec<_>>();

    // urls.sort_by(|x| x.0.cmp(&x.1));
    urls.iter().for_each(|x| println!("{:?}", x));
}

fn parse_template_files() { }