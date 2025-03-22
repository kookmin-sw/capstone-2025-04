// BOJ - 16165 걸그룹 마스터 준석이

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, m; cin >> n >> m;
    map<string, string> mm;
    map<string, vector<string> > mt;
    loop(i, 1, n) {
        string team; cin >> team;
        int member; cin >> member;
        loop(i, 1, member) {
            string mem; cin >> mem;
            mt[team].push_back(mem);
            mm[mem] = team;
        }
    }
    for(auto& v : mt) sort(v.second.begin(), v.second.end());
    loop(i, 1, m) {
        string s; cin >> s;
        int k; cin >> k;
        if(k == 0) for(string v : mt[s]) cout << v << '\n';
        else cout << mm[s] << '\n';
    }
}