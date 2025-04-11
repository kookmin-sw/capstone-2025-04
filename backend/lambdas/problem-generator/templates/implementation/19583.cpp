// BOJ - 19583 싸이버개강총회

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int cv(string s) {
    int v = 0;
    v += (s[0] - '0') * 10 + (s[1] - '0'); v *= 60;
    v += (s[3] - '0') * 10 + (s[4] - '0');
    return v;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    string s, e, q; cin >> s >> e >> q;
    int si = cv(s), ei = cv(e), qi = cv(q);
    
    map<string, int> ms, me;

    string t, n;
    while(cin >> t >> n) {
        int rt = cv(t);
        if(rt <= si) ms[n] = 1;
        if(ei <= rt && rt <= qi) me[n] = 1;
    }

    int res = 0;
    for(auto& kv : ms)
        if(me[kv.first] == 1)
            res++;

    cout << res << '\n';
}