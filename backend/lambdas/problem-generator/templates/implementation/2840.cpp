// BOJ - 2840 행운의 바퀴

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 26
 
using namespace std;
 
char seq[MAXN] = {0, };
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, k, idx = 0; cin >> n >> k;
    loop(i, 1, k) {
        ll trn; string ss; cin >> trn >> ss;
        LOOP(j, 0, trn) idx++;
        idx %= n;
        if(seq[idx] == 0) seq[idx] = ss[0];
        else if(seq[idx] != ss[0]) {
            cout << "!\n";
            return 0;
        }
    }
    set<char> s; ll cnt = 0;
    loop(i, 0, n - 1) if(seq[i] != 0) s.insert(seq[i]), cnt++;
    if(cnt != s.size()) {
        cout << "!\n"; return 0;
    }

    for(ll i = idx; i >= 0; i--) cout << (seq[i] == 0 ? '?' : seq[i]);
    for(ll i = n - 1; i > idx; i--) cout << (seq[i] == 0 ? '?' : seq[i]);
    cout << '\n';
}