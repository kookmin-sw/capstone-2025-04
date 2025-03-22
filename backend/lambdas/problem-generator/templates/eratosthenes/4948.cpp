// BOJ - 4948 베르트랑 공준

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 999999
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    ll notprime[MAXN] = {1, 1, 0};
    for(ll i = 2; i * i < MAXN; i++)
        if(!notprime[i])
            for(int j = 2; i * j < MAXN; j++)
                notprime[i * j] = 1;

    while(1) {
        ll n; cin >> n;
        if(!n) break;

        int cnt = 0;
        for(ll i = n + 1; i <= n * 2; i++) cnt += !notprime[i];
        cout << cnt << '\n';
    }
}