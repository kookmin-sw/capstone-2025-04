// BOJ - 3407 맹세

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;

map<string, ll> m; 
void prep() {
m["h"] = 1;
m["he"] = 1;
m["li"] = 1;
m["be"] = 1;
m["b"] = 1;
m["c"] = 1;
m["n"] = 1;
m["o"] = 1;
m["f"] = 1;
m["ne"] = 1;
m["na"] = 1;
m["mg"] = 1;
m["al"] = 1;
m["si"] = 1;
m["p"] = 1;
m["s"] = 1;
m["cl"] = 1;
m["ar"] = 1;
m["k"] = 1;
m["ca"] = 1;
m["sc"] = 1;
m["ti"] = 1;
m["v"] = 1;
m["cr"] = 1;
m["mn"] = 1;
m["fe"] = 1;
m["co"] = 1;
m["ni"] = 1;
m["cu"] = 1;
m["zn"] = 1;
m["ga"] = 1;
m["ge"] = 1;
m["as"] = 1;
m["se"] = 1;
m["br"] = 1;
m["kr"] = 1;
m["rb"] = 1;
m["sr"] = 1;
m["y"] = 1;
m["zr"] = 1;
m["nb"] = 1;
m["mo"] = 1;
m["tc"] = 1;
m["ru"] = 1;
m["rh"] = 1;
m["pd"] = 1;
m["ag"] = 1;
m["cd"] = 1;
m["in"] = 1;
m["sn"] = 1;
m["sb"] = 1;
m["te"] = 1;
m["i"] = 1;
m["xe"] = 1;
m["cs"] = 1;
m["ba"] = 1;
m["la"] = 1;
m["ce"] = 1;
m["pr"] = 1;
m["nd"] = 1;
m["pm"] = 1;
m["sm"] = 1;
m["eu"] = 1;
m["gd"] = 1;
m["tb"] = 1;
m["dy"] = 1;
m["ho"] = 1;
m["er"] = 1;
m["tm"] = 1;
m["yb"] = 1;
m["lu"] = 1;
m["hf"] = 1;
m["ta"] = 1;
m["w"] = 1;
m["re"] = 1;
m["os"] = 1;
m["ir"] = 1;
m["pt"] = 1;
m["au"] = 1;
m["hg"] = 1;
m["tl"] = 1;
m["pb"] = 1;
m["bi"] = 1;
m["po"] = 1;
m["at"] = 1;
m["rn"] = 1;
m["fr"] = 1;
m["ra"] = 1;
m["ac"] = 1;
m["th"] = 1;
m["pa"] = 1;
m["u"] = 1;
m["np"] = 1;
m["pu"] = 1;
m["am"] = 1;
m["cm"] = 1;
m["bk"] = 1;
m["cf"] = 1;
m["es"] = 1;
m["fm"] = 1;
m["md"] = 1;
m["no"] = 1;
m["lr"] = 1;
m["rf"] = 1;
m["db"] = 1;
m["sg"] = 1;
m["bh"] = 1;
m["hs"] = 1;
m["mt"] = 1;
m["ds"] = 1;
m["rg"] = 1;
m["cn"] = 1;
m["fl"] = 1;
m["lv"] = 1;
}
string ss;
int bfs() {
    ll visited[50001] = {0, };
    ll n = ss.size();
    queue<ll> q; q.push(0); visited[0] = 1;
    while(!q.empty()) {
        ll cur = q.front(); q.pop();
        if(cur == n) return 1;

        string cs = ss.substr(cur, 1);
        if(m[cs] && !visited[cur + 1]) { visited[cur + 1] = 1; q.push(cur + 1); }

        if(cur < n - 1) {
            string cs2 = ss.substr(cur, 2);
            if(m[cs2] && !visited[cur + 2]) { visited[cur + 2] = 1; q.push(cur + 2); }
        }
    }
    return 0;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    prep();

    ll t; cin >> t;
    while(t--) {
        cin >> ss;
        if(bfs()) cout << "YES\n";
        else cout << "NO\n";
    }
}