// BOJ - 10815 숫자 카드

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;

int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    ll n; set<ll> s;
    cin >> n;
    loop(i, 1, n) {
        ll k; cin >> k; s.insert(k);
    }
    ll m; cin >> m;
    loop(i, 1, m) {
        ll k; cin >> k;
        if(s.find(k) == s.end()) cout << "0 ";
        else cout << "1 ";
    }
    cout << '\n';
}