// BOJ - 1062 가르침

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

int n, k, sel[27], ans = 0; vector<string> words;
void update() {
    int res = 0;
    for(string word : words) {
        int f = 1;
        for(char c : word) if(!sel[c - 'a']) f = 0;
        res += f;
    }
    ans = max(ans, res);
}
void dfs(int _, int cnt) {
    if(cnt == k) { update(); return; }
    LOOP(i, _, 26) {
        if(sel[i]) continue;
        sel[i] = 1;
        dfs(i, cnt + 1);
        sel[i] = 0;
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n >> k;
    loop(i, 1, n) { string ss; cin >> ss; words.push_back(ss); }

    // always; anta + tica needs "a n t i c"
    if(k < 5) { cout << "0\n"; return 0; }
    
    sel['a' - 'a'] = sel['n' - 'a'] = sel['t' - 'a'] = sel['i' - 'a'] = sel['c' - 'a'] = 1;
    dfs(0, 5);
    
    cout << ans << '\n';
}