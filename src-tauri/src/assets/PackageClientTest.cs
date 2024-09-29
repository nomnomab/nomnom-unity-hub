using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEngine;
using UnityEngine.Pool;

public class PackageClientTest {
    [MenuItem("PackageClientTest/PerformCheck")]
    static void PerformCheck() {
        var installed = Client.List();
        while (!installed.IsCompleted) { }
        
        if (installed.Error != null) {
            Debug.LogError(installed.Error);
            return;
        }
        
        var packages = Client.SearchAll(false);
        while (!packages.IsCompleted) { }
        
        if (packages.Error != null) {
            Debug.LogError(packages.Error);
        }
        else {
            using var _ = ListPool<string>.Get(out var toAdd);
            foreach (var package in packages.Result) {
                if (installed.Result.All(x => x.name != package.name)) continue;
                
                Debug.Log($"{package.name}: {package.version} | latest: {package.versions.latest} | recommended: {package.versions.recommended}");
                toAdd.Add(package.name);
            }
            
            var request = Client.AddAndRemove(toAdd.ToArray());
        }
    }
}
